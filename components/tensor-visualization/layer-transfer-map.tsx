"use client"

import { useRef, useState, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Box, Sphere, Line } from "@react-three/drei"
import * as THREE from "three"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLayers } from "@/hooks/use-tensor-api"
import type { LayerInfo } from "@/lib/api/tensor-api-client"
import { ErrorBoundary } from "react-error-boundary"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Device position mapping for 3D visualization
const DEVICE_POSITIONS = {
  cpu: new THREE.Vector3(-15, 0, 0),
  "gpu:0": new THREE.Vector3(15, 5, 0),
  "gpu:1": new THREE.Vector3(15, -5, 0),
  nvme: new THREE.Vector3(0, -15, 0),
  ramdisk: new THREE.Vector3(0, 15, 0),
} as const

// Color mapping for different device types
const DEVICE_COLORS = {
  cpu: "#10b981", // Green
  gpu: "#3b82f6", // Blue
  nvme: "#f59e0b", // Orange
  ramdisk: "#8b5cf6", // Purple
} as const

interface LayerCubeProps {
  layer: LayerInfo
  position: THREE.Vector3
  onSelect: (layer: LayerInfo) => void
  selected: boolean
}

function LayerCube({ layer, position, onSelect, selected }: LayerCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Determine color based on device type
  const getDeviceColor = (device: string): string => {
    if (device.startsWith("gpu")) return DEVICE_COLORS.gpu
    return DEVICE_COLORS[device as keyof typeof DEVICE_COLORS] || "#6b7280"
  }

  // Calculate size based on layer size (logarithmic scale)
  const size = Math.max(0.5, Math.min(2, Math.log10(layer.current_size_mb + 1) * 0.5))

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime + layer.id) * 0.1

      // Rotation based on access frequency
      meshRef.current.rotation.y += 0.01 * (layer.access_count / 100 + 1)

      // Pulsing effect for selected layers
      if (selected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1
        meshRef.current.scale.setScalar(scale)
      } else {
        meshRef.current.scale.setScalar(hovered ? 1.2 : 1)
      }
    }
  })

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[size, size, size]}
        onClick={() => onSelect(layer)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={getDeviceColor(layer.current_device)}
          emissive={selected ? "#ff4444" : hovered ? "#ffffff" : "#000000"}
          emissiveIntensity={selected ? 0.3 : hovered ? 0.1 : 0}
          transparent
          opacity={0.8}
        />
      </Box>

      {/* Layer ID text */}
      <Text position={[0, size + 0.5, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
        L{layer.id}
      </Text>
    </group>
  )
}

interface DeviceNodeProps {
  device: string
  position: THREE.Vector3
  layerCount: number
}

function DeviceNode({ device, position, layerCount }: DeviceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const getDeviceColor = (device: string): string => {
    if (device.startsWith("gpu")) return DEVICE_COLORS.gpu
    return DEVICE_COLORS[device as keyof typeof DEVICE_COLORS] || "#6b7280"
  }

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[2, 32, 32]}>
        <meshStandardMaterial color={getDeviceColor(device)} wireframe transparent opacity={0.3} />
      </Sphere>

      <Text position={[0, -3, 0]} fontSize={0.8} color="white" anchorX="center" anchorY="middle">
        {device.toUpperCase()}
      </Text>

      <Text position={[0, -4, 0]} fontSize={0.5} color="#888888" anchorX="center" anchorY="middle">
        {layerCount} layers
      </Text>
    </group>
  )
}

interface TransferLineProps {
  start: THREE.Vector3
  end: THREE.Vector3
  progress: number
}

function TransferLine({ start, end, progress }: TransferLineProps) {
  const points = [start, end]

  return (
    <Line
      points={points}
      color="#ff4444"
      lineWidth={3}
      transparent
      opacity={0.6}
      dashed
      dashScale={50}
      dashSize={3}
      gapSize={1}
    />
  )
}

function Scene() {
  const { layers, transferLayer } = useLayers()
  const [selectedLayer, setSelectedLayer] = useState<LayerInfo | null>(null)
  const [transferring, setTransferring] = useState<Set<number>>(new Set())

  // Group layers by device
  const layersByDevice = layers.reduce(
    (acc, layer) => {
      const device = layer.current_device
      if (!acc[device]) acc[device] = []
      acc[device].push(layer)
      return acc
    },
    {} as Record<string, LayerInfo[]>,
  )

  // Calculate positions for layers within each device
  const getLayerPosition = (layer: LayerInfo, index: number, total: number): THREE.Vector3 => {
    const devicePos =
      DEVICE_POSITIONS[layer.current_device as keyof typeof DEVICE_POSITIONS] || new THREE.Vector3(0, 0, 0)

    // Arrange layers in a circle around the device
    const radius = 3
    const angle = (index / total) * Math.PI * 2
    const x = devicePos.x + Math.cos(angle) * radius
    const z = devicePos.z + Math.sin(angle) * radius

    return new THREE.Vector3(x, devicePos.y, z)
  }

  const handleLayerSelect = useCallback((layer: LayerInfo) => {
    setSelectedLayer(layer)
  }, [])

  const handleTransfer = useCallback(
    async (layerId: number, destination: string) => {
      setTransferring((prev) => new Set(prev).add(layerId))
      try {
        await transferLayer(layerId, destination)
      } catch (error) {
        console.error("Transfer failed:", error)
      } finally {
        setTransferring((prev) => {
          const next = new Set(prev)
          next.delete(layerId)
          return next
        })
      }
    },
    [transferLayer],
  )

  return (
    <>
      {/* Device nodes */}
      {Object.entries(DEVICE_POSITIONS).map(([device, position]) => (
        <DeviceNode key={device} device={device} position={position} layerCount={layersByDevice[device]?.length || 0} />
      ))}

      {/* Layer cubes */}
      {Object.entries(layersByDevice).map(([device, deviceLayers]) =>
        deviceLayers.map((layer, index) => (
          <LayerCube
            key={layer.id}
            layer={layer}
            position={getLayerPosition(layer, index, deviceLayers.length)}
            onSelect={handleLayerSelect}
            selected={selectedLayer?.id === layer.id}
          />
        )),
      )}

      {/* Transfer lines for layers being transferred */}
      {Array.from(transferring).map((layerId) => {
        const layer = layers.find((l) => l.id === layerId)
        if (!layer) return null

        const sourcePos = DEVICE_POSITIONS[layer.current_device as keyof typeof DEVICE_POSITIONS]
        // This would need to track the destination from the transfer request
        const targetPos = DEVICE_POSITIONS["cpu"] // Placeholder

        return (
          <TransferLine
            key={layerId}
            start={sourcePos}
            end={targetPos}
            progress={0.5} // This would be actual progress
          />
        )
      })}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
    </>
  )
}

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Layer Transfer Map</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <div>
            <p className="font-semibold text-red-600">Something went wrong!</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
          <Button onClick={reset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Add error handling wrapper
function LayerTransferMapContent() {
  const { layers, loading, error, transferLayer } = useLayers()
  const [selectedLayer, setSelectedLayer] = useState<LayerInfo | null>(null)
  const [transferring, setTransferring] = useState<Set<number>>(new Set())

  // Add error recovery
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Layer Transfer Map</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading layer data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Layer Transfer Map</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
            <div>
              <p className="font-semibold text-red-600">Error loading layer data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Layer Transfer Map
          <div className="flex gap-2">
            <Badge variant="outline">{layers.length} layers</Badge>
            <Badge variant="outline">{new Set(layers.map((l) => l.current_device)).size} devices</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-96 p-0">
        <Canvas camera={{ position: [30, 20, 30], fov: 60 }}>
          <Scene />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} maxDistance={100} minDistance={10} />
        </Canvas>
      </CardContent>

      {/* Layer details panel */}
      {selectedLayer && (
        <CardContent className="border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Layer {selectedLayer.id}</h4>
              <Badge variant="outline">{selectedLayer.current_device}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{selectedLayer.name}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-2">{selectedLayer.current_size_mb.toFixed(1)} MB</span>
              </div>
              <div>
                <span className="text-muted-foreground">Access Count:</span>
                <span className="ml-2">{selectedLayer.access_count}</span>
              </div>
            </div>
            {selectedLayer.quantization_type && (
              <div className="text-sm">
                <span className="text-muted-foreground">Quantization:</span>
                <span className="ml-2">{selectedLayer.quantization_type}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function LayerTransferMap() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LayerTransferMapContent />
    </ErrorBoundary>
  )
}
