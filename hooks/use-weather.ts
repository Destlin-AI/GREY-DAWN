"use client"

import useSWR from "swr"

export interface WeatherData {
  location: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  icon: string
}

// Generic fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("An error occurred while fetching the data.")
    return res.json()
  })

export function useWeather(location = "New York") {
  const { data, error, isLoading, mutate } = useSWR<WeatherData>(
    `/api/weather?location=${encodeURIComponent(location)}`,
    fetcher,
    { refreshInterval: 300000 }, // Refresh every 5 minutes
  )

  return {
    weather: data,
    isLoading,
    isError: error,
    mutate,
  }
}
