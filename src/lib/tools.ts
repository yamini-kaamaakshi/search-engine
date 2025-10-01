// Tool definitions for function calling
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export const tools: Tool[] = [
  {
    name: "get_current_weather",
    description: "Get the current weather in a given location. Use this when users ask about weather conditions, temperature, or forecast.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and country, e.g. London, UK or New York, USA"
        },
        unit: {
          type: "string",
          description: "The temperature unit to use",
          enum: ["celsius", "fahrenheit"]
        }
      },
      required: ["location"]
    }
  },
  {
    name: "get_flight_info",
    description: "Get flight information including status, delays, and schedules. Use this when users ask about flights, flight status, or travel information.",
    parameters: {
      type: "object",
      properties: {
        flight_number: {
          type: "string",
          description: "The flight number, e.g. AA100, BA456"
        },
        date: {
          type: "string",
          description: "The date in YYYY-MM-DD format. If not provided, uses today's date."
        }
      },
      required: ["flight_number"]
    }
  }
];

// Tool execution functions
export async function executeTools(toolCalls: Array<{ name: string; arguments: any }>) {
  const results = [];

  for (const toolCall of toolCalls) {
    try {
      let result;

      switch (toolCall.name) {
        case "get_current_weather":
          result = await getCurrentWeather(toolCall.arguments);
          break;
        case "get_flight_info":
          result = await getFlightInfo(toolCall.arguments);
          break;
        default:
          result = { error: `Unknown tool: ${toolCall.name}` };
      }

      results.push({
        tool: toolCall.name,
        arguments: toolCall.arguments,
        result
      });
    } catch (error) {
      results.push({
        tool: toolCall.name,
        arguments: toolCall.arguments,
        result: { error: error instanceof Error ? error.message : "Unknown error" }
      });
    }
  }

  return results;
}

// Weather API implementation
async function getCurrentWeather(args: { location: string; unit?: string }) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      return {
        location: args.location,
        temperature: 22,
        unit: args.unit || "celsius",
        condition: "Partly cloudy",
        humidity: 65,
        wind_speed: 15,
        description: "Mock weather data - Configure OPENWEATHER_API_KEY for real data"
      };
    }

    const unit = args.unit === "fahrenheit" ? "imperial" : "metric";
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(args.location)}&units=${unit}&appid=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      location: data.name,
      temperature: Math.round(data.main.temp),
      unit: args.unit || "celsius",
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed),
      feels_like: Math.round(data.main.feels_like)
    };
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Flight API implementation
async function getFlightInfo(args: { flight_number: string; date?: string }) {
  try {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      return {
        flight_number: args.flight_number,
        status: "On Time",
        departure: {
          airport: "London Heathrow (LHR)",
          scheduled: "2025-10-01T10:00:00Z",
          estimated: "2025-10-01T10:00:00Z"
        },
        arrival: {
          airport: "New York JFK (JFK)",
          scheduled: "2025-10-01T18:00:00Z",
          estimated: "2025-10-01T18:00:00Z"
        },
        airline: "British Airways",
        description: "Mock flight data - Configure AVIATIONSTACK_API_KEY for real data"
      };
    }

    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${args.flight_number}`
    );

    if (!response.ok) {
      throw new Error(`Flight API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("Flight not found");
    }

    const flight = data.data[0];

    return {
      flight_number: flight.flight.iata,
      status: flight.flight_status,
      departure: {
        airport: `${flight.departure.airport} (${flight.departure.iata})`,
        scheduled: flight.departure.scheduled,
        estimated: flight.departure.estimated,
        actual: flight.departure.actual
      },
      arrival: {
        airport: `${flight.arrival.airport} (${flight.arrival.iata})`,
        scheduled: flight.arrival.scheduled,
        estimated: flight.arrival.estimated,
        actual: flight.arrival.actual
      },
      airline: flight.airline.name
    };
  } catch (error) {
    throw new Error(`Failed to fetch flight data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}