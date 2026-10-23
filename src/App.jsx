import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  draft: 'east-nile-exam-draft',
  submissions: 'east-nile-exam-submissions',
}

const EXAM_TITLE = 'نظام امتحانات كلية شرق النيل'
const EXAM_SUBJECT = 'اختبار تجريبي - مهارات الحاسوب'
const EXAM_DURATION_SECONDS = 15 * 60

const EXAM_QUESTIONS = [
  {
    id: 1,
    question: 'ما أفضل وصف لغرض كلمة المرور القوية؟',
    options: [
      'تسهيل مشاركة الحساب مع الأصدقاء',
      'حماية الحساب من الوصول غير المصرح به',
      'تسريع اتصال الإنترنت',
      'استبدال النسخ الاحتياطي للبيانات',
    ],
  },
  {
    id: 2,
    question: 'عند استلام ملف من مصدر غير معروف، ما الإجراء الأكثر أمانًا؟',
    options: [
      'فتحه مباشرة ثم حذفه لاحقًا',
      'مشاركته مع زملاء الصف',
      'فحصه بمضاد فيروسات قبل الاستخدام',
      'إيقاف تحديثات النظام',
    ],
  },
  {
    id: 3,
    question: 'أي خيار يساعد على حماية بياناتك أثناء انقطاع الكهرباء؟',
    options: [
      'إلغاء الحفظ التلقائي',
      'حفظ العمل بشكل دوري واستخدام نسخة احتياطية',
      'ترك الجهاز دائمًا بدون كلمة مرور',
      'تعطيل التحديثات الأمنية',
    ],
  },
]

function formatTime(totalSeconds) {
  const safe = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function nowLabel() {
  return new Date().toLocaleString('ar-SD', {
    hour12: false,
  })
}

function generateAttemptNumber() {
  const stamp = Date.now().toString().slice(-7)
  return `EN-${stamp}`
}

function App() {
  const [screen, setScreen] = useState('login')
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [formError, setFormError] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS)
  const [attemptNumber, setAttemptNumber] = useState('')
  const [startTime, setStartTime] = useState('')
  const [focusEvents, setFocusEvents] = useState([])
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

  const totalQuestions = EXAM_QUESTIONS.length
  const answeredCount = Object.keys(answers).length

  const progress = useMemo(
    () => Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100),
    [currentQuestionIndex, totalQuestions],
  )

  const handleLogin = (event) => {
    event.preventDefault()
    const cleanedName = studentName.trim()
    const cleanedId = studentId.trim()

    if (!cleanedName || !cleanedId) {
      setFormError('يرجى إدخال اسم الطالب والرقم الجامعي قبل المتابعة.')
      return
    }

    if (!/^\d{5,15}$/.test(cleanedId)) {
      setFormError('الرقم الجامعي يجب أن يحتوي على أرقام فقط (5 إلى 15 رقمًا).')
      return
    }

    const draftRaw = localStorage.getItem(STORAGE_KEYS.draft)
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw)
        if (draft.studentId === cleanedId && draft.studentName === cleanedName) {
          setAnswers(draft.answers || {})
          setCurrentQuestionIndex(draft.currentQuestionIndex || 0)
          setRemainingSeconds(draft.remainingSeconds || EXAM_DURATION_SECONDS)
          setAttemptNumber(draft.attemptNumber || generateAttemptNumber())
          setStartTime(draft.startTime || nowLabel())
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.draft)
      }
    }

    setFormError('')
    setStudentName(cleanedName)
    setStudentId(cleanedId)
    setScreen('instructions')
  }

  const startExam = () => {
    if (!attemptNumber) {
      setAttemptNumber(generateAttemptNumber())
    }
    if (!startTime) {
      setStartTime(nowLabel())
    }
    setScreen('exam')
  }

  const saveAnswer = (option) => {
    const questionId = EXAM_QUESTIONS[currentQuestionIndex].id
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const goNext = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1))
  }

  const goPrevious = () => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = useCallback(async (message = 'تم تسليم المحاولة بنجاح.') => {
    if (submitStatus === 'submitting' || submitStatus === 'done') {
      return
    }

    setSubmitStatus('submitting')
    setSubmitError('')

    try {
      const submission = {
        attemptNumber,
        studentName,
        studentId,
        subject: EXAM_SUBJECT,
        startTime,
        submittedAt: nowLabel(),
        answers,
        focusEvents,
        status: 'قيد المراجعة',
      }

      const submissionsRaw = localStorage.getItem(STORAGE_KEYS.submissions)
      const submissions = submissionsRaw ? JSON.parse(submissionsRaw) : []
      submissions.push(submission)
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(submissions))
      localStorage.removeItem(STORAGE_KEYS.draft)

      await new Promise((resolve) => {
        window.setTimeout(resolve, 900)
      })

      setSubmitStatus('done')
      setSubmitMessage(message)
      setScreen('submitted')
    } catch {
      setSubmitStatus('error')
      setSubmitError('تعذر حفظ المحاولة محليًا. حاول مرة أخرى.')
    }
  }, [answers, attemptNumber, focusEvents, startTime, studentId, studentName, submitStatus])

  useEffect(() => {
    if (screen !== 'exam') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleSubmit('انتهى الوقت وتم إرسال المحاولة تلقائيًا.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [handleSubmit, screen])

  useEffect(() => {
    if (screen !== 'exam' || !studentId) {
      return
    }

    const draft = {
      studentName,
      studentId,
      currentQuestionIndex,
      answers,
      remainingSeconds,
      attemptNumber,
      startTime,
    }

    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft))
  }, [
    answers,
    attemptNumber,
    currentQuestionIndex,
    remainingSeconds,
    screen,
    startTime,
    studentId,
    studentName,
  ])

  useEffect(() => {
    if (screen !== 'exam') {
      return undefined
    }

    const registerEvent = (label) => {
      setFocusEvents((prev) => [...prev, { label, time: nowLabel() }])
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        registerEvent('تبديل التبويب أو إخفاء نافذة الامتحان')
      }
    }

    const onBlur = () => registerEvent('الخروج من وضع التركيز')
    const onFocus = () => registerEvent('العودة إلى الامتحان')

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [screen])

  const examQuestion = EXAM_QUESTIONS[currentQuestionIndex]

  return (
    <main className="layout" dir="rtl" lang="ar">
      <header className="brand-card">
        <img
          src="/college-logo-placeholder.svg"
          alt="مكان شعار كلية شرق النيل"
          className="college-logo"
        />
        <div>
          <h1>{EXAM_TITLE}</h1>
          <p className="subtitle">واجهة تجريبية أولية بدون Backend أو قاعدة بيانات خارج المتصفح.</p>
        </div>
      </header>

      {screen === 'login' && (
        <section className="card">
          <h2>دخول الطالب</h2>
          <form onSubmit={handleLogin} className="form-grid">
            <label>
              الاسم الكامل
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="مثال: أحمد محمد"
              />
            </label>
            <label>
              الرقم الجامعي
              <input
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="مثال: 202401234"
                inputMode="numeric"
              />
            </label>
            {formError && <p className="error">{formError}</p>}
            <button type="submit" className="primary-btn">
              متابعة
            </button>
          </form>
        </section>
      )}

      {screen === 'instructions' && (
        <section className="card">
          <h2>تعليمات الامتحان</h2>
          <ul className="instructions">
            <li>المدة: {Math.round(EXAM_DURATION_SECONDS / 60)} دقيقة.</li>
            <li>سيظهر سؤال واحد في كل مرة ويمكن التنقل بين الأسئلة.</li>
            <li>يتم حفظ إجاباتك محليًا داخل هذا المتصفح أثناء الامتحان.</li>
            <li>لن يتم عرض الدرجة بعد التسليم، وستكون الحالة: قيد المراجعة.</li>
          </ul>
          <div className="meta">
            <strong>الطالب:</strong> {studentName} — {studentId}
          </div>
          <button type="button" className="primary-btn" onClick={startExam}>
            بدء الامتحان
          </button>
        </section>
      )}

      {screen === 'exam' && (
        <section
          className="card exam-mode"
          onCopy={(event) => event.preventDefault()}
          onPaste={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="exam-top">
            <p>
              <strong>{EXAM_SUBJECT}</strong>
            </p>
            <p>المتبقي: {formatTime(remainingSeconds)}</p>
          </div>

          <div className="progress-wrap" aria-label="شريط تقدم الامتحان">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>

          <p className="question-index">
            السؤال {currentQuestionIndex + 1} من {totalQuestions}
          </p>
          <h3>{examQuestion.question}</h3>

          <div className="options">
            {examQuestion.options.map((option) => {
              const isSelected = answers[examQuestion.id] === option
              return (
                <button
                  key={option}
                  type="button"
                  className={`option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => saveAnswer(option)}
                >
                  {option}
                </button>
              )
            })}
          </div>

          <div className="actions-row">
            <button type="button" className="secondary-btn" onClick={goPrevious}>
              السابق
            </button>
            <button type="button" className="secondary-btn" onClick={goNext}>
              التالي
            </button>
            <button type="button" className="danger-btn" onClick={() => handleSubmit()}>
              تسليم الامتحان
            </button>
          </div>

          <p className="meta">
            الإجابات المسجلة: {answeredCount} / {totalQuestions}
          </p>
          <p className="warning-note">
            تنبيه: هذه مؤشرات حماية واجهة فقط ولا تضمن منع الغش بشكل كامل دون حماية من جهة الخادم.
          </p>
          {submitStatus === 'error' && <p className="error">{submitError}</p>}
          {submitStatus === 'submitting' && <p className="loading">جارٍ حفظ المحاولة...</p>}
        </section>
      )}

      {screen === 'submitted' && (
        <section className="card">
          <h2>تم استلام المحاولة</h2>
          <p className="success">{submitMessage}</p>
          <p>
            <strong>اسم الطالب:</strong> {studentName}
          </p>
          <p>
            <strong>الرقم الجامعي:</strong> {studentId}
          </p>
          <p>
            <strong>رقم المحاولة:</strong> {attemptNumber}
          </p>
          <p>
            حالتك الآن: <strong>قيد المراجعة</strong> — النتيجة لا تُعرض في هذه المرحلة.
          </p>
          <button type="button" className="primary-btn" onClick={() => setScreen('review')}>
            فتح شاشة المراجعة التجريبية
          </button>
        </section>
      )}

      {screen === 'review' && (
        <section className="card">
          <h2>مراجعة إدارية تجريبية</h2>
          <p>
            جميع البيانات الحالية محفوظة محليًا للمراجعة التجريبية فقط. يلزم Backend حقيقي ولوحة إدارة
            وربط قاعدة بيانات قبل أي استخدام فعلي.
          </p>
          <div className="review-box">
            <p>
              <strong>الطالب:</strong> {studentName} — {studentId}
            </p>
            <p>
              <strong>رقم المحاولة:</strong> {attemptNumber}
            </p>
            <p>
              <strong>وقت البدء:</strong> {startTime || 'غير متاح'}
            </p>
            <p>
              <strong>الحالة:</strong> قيد المراجعة
            </p>
          </div>

          <h3>سجل أحداث التركيز (محلي)</h3>
          {focusEvents.length === 0 ? (
            <p className="meta">لم يتم تسجيل أحداث مغادرة/عودة أثناء هذه المحاولة.</p>
          ) : (
            <ul className="events-list">
              {focusEvents.map((event, index) => (
                <li key={`${event.time}-${index}`}>
                  {event.label} — <span>{event.time}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}

export default App
