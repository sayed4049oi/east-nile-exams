import { useCallback, useEffect, useRef, useState } from 'react'
import {
  WeatherApiError,
  fetchCityByCoords,
  fetchCitySuggestions,
  fetchWeatherByCoords,
} from './services/weatherApi'
import './WeatherDashboard.css'

const WEATHER_CODE_MAP = {
  0: { label: 'صحو', icon: '☀️' },
  1: { label: 'غائم جزئيًا', icon: '🌤️' },
  2: { label: 'غائم', icon: '⛅' },
  3: { label: 'غائم كليًا', icon: '☁️' },
  45: { label: 'ضباب', icon: '🌫️' },
  48: { label: 'ضباب كثيف', icon: '🌫️' },
  51: { label: 'رذاذ خفيف', icon: '🌦️' },
  53: { label: 'رذاذ متوسط', icon: '🌦️' },
  55: { label: 'رذاذ كثيف', icon: '🌧️' },
  56: { label: 'رذاذ متجمد خفيف', icon: '🌧️' },
  57: { label: 'رذاذ متجمد كثيف', icon: '🌧️' },
  61: { label: 'مطر خفيف', icon: '🌦️' },
  63: { label: 'مطر متوسط', icon: '🌧️' },
  65: { label: 'مطر غزير', icon: '🌧️' },
  66: { label: 'مطر متجمد خفيف', icon: '🌨️' },
  67: { label: 'مطر متجمد كثيف', icon: '🌨️' },
  71: { label: 'ثلوج خفيفة', icon: '🌨️' },
  73: { label: 'ثلوج متوسطة', icon: '❄️' },
  75: { label: 'ثلوج كثيفة', icon: '❄️' },
  77: { label: 'حبوب ثلج', icon: '🌨️' },
  80: { label: 'زخات مطر خفيفة', icon: '🌦️' },
  81: { label: 'زخات مطر متوسطة', icon: '🌧️' },
  82: { label: 'زخات مطر قوية', icon: '⛈️' },
  85: { label: 'زخات ثلج خفيفة', icon: '🌨️' },
  86: { label: 'زخات ثلج قوية', icon: '❄️' },
  95: { label: 'عاصفة رعدية', icon: '⛈️' },
  96: { label: 'عاصفة رعدية مع برد خفيف', icon: '⛈️' },
  99: { label: 'عاصفة رعدية مع برد قوي', icon: '⛈️' },
}

const DEFAULT_STATUS = 'idle'

function formatNumber(value, maximumFractionDigits = 1) {
  if (typeof value !== 'number') {
    return '—'
  }

  return new Intl.NumberFormat('ar-SD', {
    maximumFractionDigits,
  }).format(value)
}

function formatDate(dateValue, options) {
  return new Intl.DateTimeFormat('ar-SD', options).format(new Date(dateValue))
}

function getConditionDetails(code) {
  return WEATHER_CODE_MAP[code] || { label: 'حالة غير معروفة', icon: '🌡️' }
}

function windDirectionLabel(degrees) {
  if (typeof degrees !== 'number') {
    return 'غير معروف'
  }

  const directions = ['شمال', 'شمال شرقي', 'شرق', 'جنوب شرقي', 'جنوب', 'جنوب غربي', 'غرب', 'شمال غربي']
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return directions[index]
}

function mapErrorMessage(error) {
  if (error instanceof WeatherApiError) {
    if (error.code === 'network') {
      return 'تعذر الاتصال بالإنترنت. تحقق من الشبكة ثم حاول مرة أخرى.'
    }

    if (error.code === 'invalid_city') {
      return 'يرجى اختيار مدينة صحيحة من نتائج البحث.'
    }

    return error.message
  }

  return 'تعذر تحميل بيانات الطقس الآن. حاول مرة أخرى لاحقًا.'
}

function WeatherDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [geoMessage, setGeoMessage] = useState('')
  const abortRef = useRef(null)

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const cityResults = await fetchCitySuggestions(searchQuery, controller.signal)
        setSuggestions(cityResults)
        setShowSuggestions(true)
        setHighlightedIndex(cityResults.length ? 0 : -1)

        if (cityResults.length === 0) {
          setStatus((prev) => (prev === 'ready' ? prev : 'empty'))
        } else {
          setStatus((prev) => (prev === 'ready' ? prev : 'idle'))
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setSuggestions([])
        setShowSuggestions(false)
        setStatus('error')
        setErrorMessage(mapErrorMessage(error))
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const loadWeather = useCallback(async (location) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setErrorMessage('')

    try {
      const nextWeatherData = await fetchWeatherByCoords(location, controller.signal)
      setWeatherData(nextWeatherData)
      setSelectedLocation(location)
      setStatus('ready')
      setLastUpdated(new Date().toISOString())
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      setStatus('error')
      setErrorMessage(mapErrorMessage(error))
    }
  }, [])

  const pickCity = useCallback((city) => {
    setSearchQuery(city.label)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    loadWeather(city)
  }, [loadWeather])

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      setStatus('empty')
      setErrorMessage('')
      setGeoMessage('اكتب اسم المدينة للبدء.')
      return
    }

    setGeoMessage('')

    try {
      setStatus('loading')
      const cityResults = await fetchCitySuggestions(trimmedQuery)

      if (cityResults.length === 0) {
        setStatus('error')
        setErrorMessage('لم يتم العثور على مدينة بهذا الاسم. جرب كتابة الاسم بشكل أدق.')
        return
      }

      pickCity(cityResults[0])
    } catch (error) {
      setStatus('error')
      setErrorMessage(mapErrorMessage(error))
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMessage('المتصفح الحالي لا يدعم تحديد الموقع الجغرافي.')
      return
    }

    setGeoMessage('جارٍ تحديد موقعك...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const city = await fetchCityByCoords(position.coords.latitude, position.coords.longitude)
          setGeoMessage('تم تحديد موقعك بنجاح.')
          setSearchQuery(city.label)
          pickCity(city)
        } catch (error) {
          setStatus('error')
          setGeoMessage('تعذر تحويل الإحداثيات إلى مدينة. يمكنك المتابعة بالبحث اليدوي.')
          setErrorMessage(mapErrorMessage(error))
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage('تم رفض إذن الموقع. استخدم البحث عن مدينة بدلًا من ذلك.')
          return
        }

        setGeoMessage('تعذر الحصول على الموقع الحالي. جرب البحث عن مدينة.')
      },
      {
        timeout: 12000,
        maximumAge: 300000,
      },
    )
  }

  const handleSearchKeyDown = (event) => {
    if (!showSuggestions || suggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      pickCity(suggestions[highlightedIndex])
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const currentCondition = weatherData?.current
    ? getConditionDetails(weatherData.current.weatherCode)
    : null

  return (
    <section className="card weather-card" aria-labelledby="weather-dashboard-title">
      <h2 id="weather-dashboard-title">لوحة الطقس</h2>
      <p className="weather-intro">ابحث عن مدينة أو استخدم موقعك الحالي لعرض الطقس الحالي وتوقعات الأيام القادمة.</p>

      <form className="weather-controls" onSubmit={handleSearchSubmit}>
        <label htmlFor="city-search">ابحث عن مدينة</label>
        <div className="search-wrap">
          <input
            id="city-search"
            value={searchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value
              setSearchQuery(nextQuery)
              if (nextQuery.trim().length < 2) {
                setSuggestions([])
                setShowSuggestions(false)
                setHighlightedIndex(-1)
                setStatus(weatherData ? 'ready' : 'idle')
              } else {
                setStatus('searching')
              }
              setErrorMessage('')
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="مثال: الخرطوم"
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="city-suggestions"
            aria-autocomplete="list"
          />
          <button type="submit" className="primary-btn">بحث</button>
          <button type="button" className="secondary-btn" onClick={handleUseCurrentLocation}>
            استخدام موقعي
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => selectedLocation && loadWeather(selectedLocation)}
            disabled={!selectedLocation || status === 'loading'}
          >
            تحديث
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul id="city-suggestions" className="suggestions" role="listbox">
            {suggestions.map((city, index) => (
              <li key={`${city.id}-${city.latitude}-${city.longitude}`} role="option" aria-selected={highlightedIndex === index}>
                <button
                  type="button"
                  className={`suggestion-btn ${highlightedIndex === index ? 'is-active' : ''}`}
                  onClick={() => pickCity(city)}
                >
                  {city.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {geoMessage && <p className="meta">{geoMessage}</p>}
      {lastUpdated && status === 'ready' && (
        <p className="meta">
          آخر تحديث ناجح: {formatDate(lastUpdated, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      {status === 'loading' && <p className="loading">جارٍ تحميل بيانات الطقس...</p>}
      {status === 'searching' && <p className="loading">جارٍ البحث عن المدن...</p>}
      {status === 'empty' && <p className="warning-note">لا توجد بيانات بعد. ابحث عن مدينة للمتابعة.</p>}
      {status === 'error' && <p className="error">{errorMessage || 'تعذر تحميل البيانات.'}</p>}

      {status === 'ready' && weatherData && currentCondition && (
        <>
          <article className="weather-summary" aria-live="polite">
            <header>
              <h3>{selectedLocation?.label || 'المدينة المختارة'}</h3>
              <p className="weather-condition">
                <span className="weather-icon" aria-hidden="true">{currentCondition.icon}</span>
                <span>{currentCondition.label}</span>
              </p>
            </header>

            <div className="weather-grid">
              <p><strong>الحرارة:</strong> {formatNumber(weatherData.current.temperature)}°م</p>
              <p><strong>المحسوسة:</strong> {formatNumber(weatherData.current.feelsLike)}°م</p>
              <p><strong>الرطوبة:</strong> {formatNumber(weatherData.current.humidity, 0)}٪</p>
              <p>
                <strong>الرياح:</strong> {formatNumber(weatherData.current.windSpeed)} كم/س
                {' '}
                ({windDirectionLabel(weatherData.current.windDirection)})
              </p>
              <p><strong>الهطول:</strong> {formatNumber(weatherData.current.precipitation)} مم</p>
              <p>
                <strong>وقت القراءة:</strong>{' '}
                {formatDate(weatherData.current.time, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </article>

          <section aria-labelledby="forecast-title" className="forecast-section">
            <h3 id="forecast-title">توقعات 7 أيام</h3>
            <div className="forecast-grid">
              {weatherData.forecast.map((day) => {
                const condition = getConditionDetails(day.weatherCode)

                return (
                  <article key={day.date} className="forecast-card">
                    <h4>{formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'short' })}</h4>
                    <p className="weather-condition">
                      <span className="weather-icon" aria-hidden="true">{condition.icon}</span>
                      <span>{condition.label}</span>
                    </p>
                    <p>العظمى: {formatNumber(day.temperatureMax)}°م</p>
                    <p>الصغرى: {formatNumber(day.temperatureMin)}°م</p>
                    <p>هطول: {formatNumber(day.precipitation)} مم</p>
                    <p>شروق: {formatDate(day.sunrise, { timeStyle: 'short' })}</p>
                    <p>غروب: {formatDate(day.sunset, { timeStyle: 'short' })}</p>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </section>
  )
}

export default WeatherDashboard
