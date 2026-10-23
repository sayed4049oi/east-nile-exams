const GEO_BASE_URL = 'https://geocoding-api.open-meteo.com/v1'
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast'

class WeatherApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function buildCityLabel(city) {
  return [city.name, city.admin1, city.country].filter(Boolean).join('، ')
}

function mapCity(result) {
  return {
    id: result.id,
    name: result.name,
    country: result.country,
    admin1: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    label: buildCityLabel(result),
  }
}

function isNetworkError(error) {
  return error instanceof TypeError
}

async function fetchJson(url, signal) {
  try {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new WeatherApiError('api', 'تعذر الوصول إلى خدمة الطقس حاليًا.')
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    if (error instanceof WeatherApiError) {
      throw error
    }

    if (isNetworkError(error)) {
      throw new WeatherApiError('network', 'لا يوجد اتصال بالشبكة أو تعذر الوصول إلى الخدمة.')
    }

    throw new WeatherApiError('api', 'حدث خطأ غير متوقع أثناء جلب بيانات الطقس.')
  }
}

export async function fetchCitySuggestions(query, signal) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  const url = `${GEO_BASE_URL}/search?name=${encodeURIComponent(trimmedQuery)}&count=8&language=ar&format=json`
  const data = await fetchJson(url, signal)
  const results = Array.isArray(data.results) ? data.results : []

  return results.map(mapCity)
}

export async function fetchCityByCoords(latitude, longitude, signal) {
  const url = `${GEO_BASE_URL}/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=ar&format=json`
  const data = await fetchJson(url, signal)
  const firstResult = data?.results?.[0]

  if (!firstResult) {
    return {
      id: `coords-${latitude}-${longitude}`,
      name: 'موقعك الحالي',
      latitude,
      longitude,
      label: 'موقعك الحالي',
    }
  }

  return mapCity(firstResult)
}

function normalizeCurrentWeather(raw) {
  if (!raw?.current) {
    throw new WeatherApiError('api', 'بيانات الطقس الحالية غير مكتملة.')
  }

  return {
    time: raw.current.time,
    temperature: raw.current.temperature_2m,
    feelsLike: raw.current.apparent_temperature,
    humidity: raw.current.relative_humidity_2m,
    windSpeed: raw.current.wind_speed_10m,
    windDirection: raw.current.wind_direction_10m,
    precipitation: raw.current.precipitation,
    weatherCode: raw.current.weather_code,
    isDay: raw.current.is_day,
  }
}

function normalizeDailyForecast(raw) {
  if (!raw?.daily) {
    throw new WeatherApiError('api', 'بيانات التوقعات اليومية غير مكتملة.')
  }

  const {
    time,
    weather_code: weatherCode,
    temperature_2m_max: temperatureMax,
    temperature_2m_min: temperatureMin,
    sunrise,
    sunset,
    precipitation_sum: precipitation,
  } = raw.daily

  if (!time || !weatherCode || !temperatureMax || !temperatureMin || !sunrise || !sunset || !precipitation) {
    throw new WeatherApiError('api', 'تعذر تجهيز توقعات الأيام القادمة.')
  }

  return time.map((date, index) => ({
    date,
    weatherCode: weatherCode[index],
    temperatureMax: temperatureMax[index],
    temperatureMin: temperatureMin[index],
    sunrise: sunrise[index],
    sunset: sunset[index],
    precipitation: precipitation[index],
  }))
}

export async function fetchWeatherByCoords(location, signal) {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    throw new WeatherApiError('invalid_city', 'المدينة المختارة غير صالحة.')
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
    ].join(','),
    timezone: 'auto',
    forecast_days: '7',
  })

  const data = await fetchJson(`${FORECAST_BASE_URL}?${params.toString()}`, signal)

  return {
    location,
    timezone: data.timezone,
    current: normalizeCurrentWeather(data),
    forecast: normalizeDailyForecast(data),
  }
}

export { WeatherApiError }
