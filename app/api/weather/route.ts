import { NextResponse } from "next/server"
import { fetchWeatherData } from "@/lib/weather-api"

export async function GET(request: Request) {
  try {
    // Get location from query parameter
    const url = new URL(request.url)
    const location = url.searchParams.get("location") || "New York"

    const weatherData = await fetchWeatherData(location)

    return NextResponse.json(weatherData)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
