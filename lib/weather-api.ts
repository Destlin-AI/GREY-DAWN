export interface WeatherData {
  location: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  icon: string
}

// Mock weather data - in a real app, this would come from a weather API
export async function fetchWeatherData(location = "New York"): Promise<WeatherData> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Generate random weather data for demo purposes
  const conditions = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Thunderstorm", "Snow", "Fog"]
  const icons = ["sun", "cloud-sun", "cloud", "cloud-rain", "cloud-lightning", "cloud-snow", "cloud-fog"]

  const conditionIndex = Math.floor(Math.random() * conditions.length)

  return {
    location,
    temperature: Math.floor(Math.random() * 35) - 5, // -5 to 30°C
    condition: conditions[conditionIndex],
    humidity: Math.floor(Math.random() * 60) + 30, // 30% to 90%
    windSpeed: Math.floor(Math.random() * 30) + 5, // 5 to 35 km/h
    icon: icons[conditionIndex],
  }
}
