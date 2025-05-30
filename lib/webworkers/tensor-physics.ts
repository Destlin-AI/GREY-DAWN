// Web Worker for tensor movement physics simulation
// This runs in a separate thread to avoid blocking the main UI

interface TensorParticle {
  id: string
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  acceleration: { x: number; y: number; z: number }
  mass: number
  size: number
  color: string
  target?: { x: number; y: number; z: number }
  transferring: boolean
  sourceDevice: string
  targetDevice: string
}

interface PhysicsConfig {
  gravity: number
  friction: number
  attraction: number
  repulsion: number
  maxVelocity: number
  deltaTime: number
}

class TensorPhysicsEngine {
  private particles: Map<string, TensorParticle> = new Map()
  private config: PhysicsConfig = {
    gravity: 0.1,
    friction: 0.98,
    attraction: 0.5,
    repulsion: 100,
    maxVelocity: 10,
    deltaTime: 1 / 60,
  }
  private running = false
  private animationId: number | null = null

  constructor() {
    this.setupMessageHandlers()
  }

  private setupMessageHandlers() {
    self.onmessage = (event) => {
      const { type, data } = event.data

      switch (type) {
        case "START":
          this.start()
          break
        case "STOP":
          this.stop()
          break
        case "ADD_PARTICLE":
          this.addParticle(data)
          break
        case "REMOVE_PARTICLE":
          this.removeParticle(data.id)
          break
        case "UPDATE_PARTICLE":
          this.updateParticle(data.id, data.updates)
          break
        case "SET_CONFIG":
          this.updateConfig(data)
          break
        case "TRANSFER_LAYER":
          this.startTransfer(data.layerId, data.source, data.target)
          break
      }
    }
  }

  private start() {
    if (this.running) return
    this.running = true
    this.simulate()
  }

  private stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private simulate() {
    if (!this.running) return

    this.updatePhysics()
    this.sendParticleUpdates()

    this.animationId = requestAnimationFrame(() => this.simulate())
  }

  private updatePhysics() {
    const particles = Array.from(this.particles.values())

    for (const particle of particles) {
      // Reset acceleration
      particle.acceleration = { x: 0, y: 0, z: 0 }

      // Apply forces
      this.applyGravity(particle)
      this.applyAttractionToTarget(particle)
      this.applyRepulsionFromOthers(particle, particles)

      // Update velocity
      particle.velocity.x += particle.acceleration.x * this.config.deltaTime
      particle.velocity.y += particle.acceleration.y * this.config.deltaTime
      particle.velocity.z += particle.acceleration.z * this.config.deltaTime

      // Apply friction
      particle.velocity.x *= this.config.friction
      particle.velocity.y *= this.config.friction
      particle.velocity.z *= this.config.friction

      // Limit velocity
      const speed = Math.sqrt(particle.velocity.x ** 2 + particle.velocity.y ** 2 + particle.velocity.z ** 2)
      if (speed > this.config.maxVelocity) {
        const scale = this.config.maxVelocity / speed
        particle.velocity.x *= scale
        particle.velocity.y *= scale
        particle.velocity.z *= scale
      }

      // Update position
      particle.position.x += particle.velocity.x * this.config.deltaTime
      particle.position.y += particle.velocity.y * this.config.deltaTime
      particle.position.z += particle.velocity.z * this.config.deltaTime

      // Check if reached target
      if (particle.target && particle.transferring) {
        const distance = this.calculateDistance(particle.position, particle.target)
        if (distance < 1.0) {
          particle.transferring = false
          particle.target = undefined
          particle.sourceDevice = particle.targetDevice

          // Notify main thread of transfer completion
          self.postMessage({
            type: "TRANSFER_COMPLETE",
            data: { particleId: particle.id },
          })
        }
      }
    }
  }

  private applyGravity(particle: TensorParticle) {
    particle.acceleration.y -= this.config.gravity
  }

  private applyAttractionToTarget(particle: TensorParticle) {
    if (!particle.target || !particle.transferring) return

    const dx = particle.target.x - particle.position.x
    const dy = particle.target.y - particle.position.y
    const dz = particle.target.z - particle.position.z
    const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

    if (distance > 0) {
      const force = this.config.attraction / distance
      particle.acceleration.x += (dx / distance) * force
      particle.acceleration.y += (dy / distance) * force
      particle.acceleration.z += (dz / distance) * force
    }
  }

  private applyRepulsionFromOthers(particle: TensorParticle, allParticles: TensorParticle[]) {
    for (const other of allParticles) {
      if (other.id === particle.id) continue

      const dx = particle.position.x - other.position.x
      const dy = particle.position.y - other.position.y
      const dz = particle.position.z - other.position.z
      const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

      if (distance > 0 && distance < 5) {
        const force = this.config.repulsion / distance ** 2
        particle.acceleration.x += (dx / distance) * force
        particle.acceleration.y += (dy / distance) * force
        particle.acceleration.z += (dz / distance) * force
      }
    }
  }

  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number },
  ): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2 + (pos1.z - pos2.z) ** 2)
  }

  private addParticle(particleData: Partial<TensorParticle>) {
    const particle: TensorParticle = {
      id: particleData.id || Math.random().toString(36),
      position: particleData.position || { x: 0, y: 0, z: 0 },
      velocity: particleData.velocity || { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: particleData.mass || 1,
      size: particleData.size || 1,
      color: particleData.color || "#ffffff",
      transferring: false,
      sourceDevice: particleData.sourceDevice || "cpu",
      targetDevice: particleData.targetDevice || "cpu",
      ...particleData,
    }

    this.particles.set(particle.id, particle)
  }

  private removeParticle(id: string) {
    this.particles.delete(id)
  }

  private updateParticle(id: string, updates: Partial<TensorParticle>) {
    const particle = this.particles.get(id)
    if (particle) {
      Object.assign(particle, updates)
    }
  }

  private updateConfig(newConfig: Partial<PhysicsConfig>) {
    Object.assign(this.config, newConfig)
  }

  private startTransfer(layerId: string, sourceDevice: string, targetDevice: string) {
    const particle = this.particles.get(layerId)
    if (particle) {
      particle.transferring = true
      particle.sourceDevice = sourceDevice
      particle.targetDevice = targetDevice

      // Set target position based on device type
      particle.target = this.getDevicePosition(targetDevice)

      // Add some initial velocity towards target
      if (particle.target) {
        const dx = particle.target.x - particle.position.x
        const dy = particle.target.y - particle.position.y
        const dz = particle.target.z - particle.position.z
        const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

        if (distance > 0) {
          particle.velocity.x += (dx / distance) * 2
          particle.velocity.y += (dy / distance) * 2
          particle.velocity.z += (dz / distance) * 2
        }
      }
    }
  }

  private getDevicePosition(device: string): { x: number; y: number; z: number } {
    // Define positions for different device types
    const positions = {
      cpu: { x: -10, y: 0, z: 0 },
      "gpu:0": { x: 10, y: 5, z: 0 },
      "gpu:1": { x: 10, y: -5, z: 0 },
      nvme: { x: 0, y: -10, z: 0 },
      ramdisk: { x: 0, y: 10, z: 0 },
    }

    return positions[device as keyof typeof positions] || { x: 0, y: 0, z: 0 }
  }

  private sendParticleUpdates() {
    const particleData = Array.from(this.particles.values()).map((particle) => ({
      id: particle.id,
      position: particle.position,
      velocity: particle.velocity,
      transferring: particle.transferring,
      sourceDevice: particle.sourceDevice,
      targetDevice: particle.targetDevice,
      color: particle.color,
      size: particle.size,
    }))

    self.postMessage({
      type: "PARTICLE_UPDATE",
      data: particleData,
    })
  }
}

// Initialize the physics engine
const engine = new TensorPhysicsEngine()

// Export types for TypeScript
export type { TensorParticle, PhysicsConfig }
