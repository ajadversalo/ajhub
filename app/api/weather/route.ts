import { getRequestUser } from "@/app/auth";

const descriptions: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Heavy freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers",
  82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm",
  96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
};

export async function GET(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=America%2FVancouver";
    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = await response.json();
    const current = data.current;
    if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") throw new Error("Invalid weather response");
    return Response.json({ temperature: Math.round(current.temperature_2m), apparentTemperature: Math.round(current.apparent_temperature), code: current.weather_code, isDay: current.is_day === 1, label: descriptions[current.weather_code] ?? "Current conditions", location: "Vancouver" }, { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1200" } });
  } catch (error) {
    console.error("Weather unavailable", error);
    return Response.json({ error: "Weather unavailable" }, { status: 503 });
  }
}
