import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  draft: 'east-nile-exam-draft',
  submissions: 'east-nile-exam-submissions',
  adminSession: 'east-nile-admin-session',
}

const EXAM_TITLE = 'نظام امتحانات كلية شرق النيل'
const EXAM_SUBJECT = 'اختبار تجريبي - مهارات الحاسوب'
const EXAM_DURATION_SECONDS = 15 * 60
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'east-nile-demo'

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
    correctAnswer: 'حماية الحساب من الوصول غير المصرح به',
    points: 1,
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
    correctAnswer: 'فحصه بمضاد فيروسات قبل الاستخدام',
    points: 1,
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
    correctAnswer: 'حفظ العمل بشكل دوري واستخدام نسخة احتياطية',
    points: 1,
  },
]

function formatTime(totalSeconds) {
  const safe = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function nowLabel() {
  return new Date().toLocaleString('ar-SD', { hour12: false })
}

function generateAttemptNumber() {
  return `EN-${Date.now().toString().slice(-7)}`
}

function readSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.submissions)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
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
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [submissions, setSubmissions] = useState(readSubmissions)
  const [notice, setNotice] = useState('')

  const totalQuestions = EXAM_QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const progress = useMemo(
    () => Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100),
    [currentQuestionIndex, totalQuestions],
  )
  const objectiveTotal = EXAM_QUESTIONS.reduce((sum, question) => sum + question.points, 0)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.adminSession) === 'true') {
      setScreen('admin')
    }
  }, [])

  const openAdminLogin = () => {
    setAdminError('')
    setScreen('admin-login')
  }

  const handleAdminLogin = (event) => {
    event.preventDefault()
    if (adminUsername.trim() === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEYS.adminSession, 'true')
      setAdminError('')
      setScreen('admin')
      setSubmissions(readSubmissions())
      return
    }
    setAdminError('بيانات الدخول غير صحيحة. استخدم الحساب التجريبي الموضح أدناه.')
  }

  const logoutAdmin = () => {
    localStorage.removeItem(STORAGE_KEYS.adminSession)
    setSelectedSubmission(null)
    setScreen('login')
  }

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
    if (!attemptNumber) setAttemptNumber(generateAttemptNumber())
    if (!startTime) setStartTime(nowLabel())
    setScreen('exam')
  }

  const saveAnswer = (option) => {
    const questionId = EXAM_QUESTIONS[currentQuestionIndex].id
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleSubmit = useCallback(async (message = 'تم تسليم المحاولة بنجاح.') => {
    if (submitStatus === 'submitting' || submitStatus === 'done') return
    setSubmitStatus('submitting')
    setSubmitError('')
    try {
      const submission = {
        id: `${attemptNumber}-${Date.now()}`,
        attemptNumber,
        studentName,
        studentId,
        subject: EXAM_SUBJECT,
        startTime,
        submittedAt: nowLabel(),
        answers,
        focusEvents,
        status: 'قيد المراجعة',
        objectiveScore: null,
        manualScore: 0,
        totalScore: null,
        comment: '',
        published: false,
      }
      const nextSubmissions = [...readSubmissions(), submission]
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(nextSubmissions))
      localStorage.removeItem(STORAGE_KEYS.draft)
      setSubmissions(nextSubmissions)
      await new Promise((resolve) => window.setTimeout(resolve, 500))
      setSubmitStatus('done')
      setSubmitMessage(message)
      setScreen('submitted')
    } catch {
      setSubmitStatus('error')
      setSubmitError('تعذر حفظ المحاولة محليًا. حاول مرة أخرى.')
    }
  }, [answers, attemptNumber, focusEvents, startTime, studentId, studentName, submitStatus])

  useEffect(() => {
    if (screen !== 'exam') return undefined
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
    if (screen !== 'exam' || !studentId) return
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify({
      studentName, studentId, currentQuestionIndex, answers, remainingSeconds, attemptNumber, startTime,
    }))
  }, [answers, attemptNumber, currentQuestionIndex, remainingSeconds, screen, startTime, studentId, studentName])

  useEffect(() => {
    if (screen !== 'exam') return undefined
    const registerEvent = (label) => setFocusEvents((prev) => [...prev, { label, time: nowLabel() }])
    const onVisibilityChange = () => document.hidden && registerEvent('تبديل التبويب أو إخفاء نافذة الامتحان')
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

  const reviewSubmission = (submission) => {
    setSelectedSubmission({ ...submission, editedManualScore: submission.manualScore || 0, editedComment: submission.comment || '' })
  }

  const calculateObjectiveScore = (submission) => EXAM_QUESTIONS.reduce(
    (sum, question) => sum + (submission.answers?.[question.id] === question.correctAnswer ? question.points : 0),
    0,
  )

  const saveReview = () => {
    if (!selectedSubmission) return
    const objectiveScore = calculateObjectiveScore(selectedSubmission)
    const manualScore = Number(selectedSubmission.editedManualScore) || 0
    const totalScore = objectiveScore + manualScore
    const updated = submissions.map((item) => item.id === selectedSubmission.id ? {
      ...item,
      objectiveScore,
      manualScore,
      totalScore,
      comment: selectedSubmission.editedComment,
      status: 'تم التصحيح',
    } : item)
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(updated))
    setSubmissions(updated)
    setSelectedSubmission(null)
    setNotice('تم حفظ التصحيح. يمكنك نشر النتيجة من قائمة المحاولات.')
  }

  const publishSubmission = (submission) => {
    const objectiveScore = submission.objectiveScore ?? calculateObjectiveScore(submission)
    const updated = submissions.map((item) => item.id === submission.id ? {
      ...item,
      objectiveScore,
      totalScore: objectiveScore + (Number(item.manualScore) || 0),
      status: 'تم نشر النتيجة',
      published: true,
      publishedAt: nowLabel(),
    } : item)
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(updated))
    setSubmissions(updated)
    setNotice('تم نشر النتيجة للطالب في هذا المتصفح التجريبي.')
  }

  const examQuestion = EXAM_QUESTIONS[currentQuestionIndex]
  const pendingCount = submissions.filter((item) => !item.published).length

  return (
    <main className="layout" dir="rtl" lang="ar">
      <header className="brand-card">
        <img src="/college-logo-placeholder.svg" alt="مكان شعار كلية شرق النيل" className="college-logo" />
        <div className="brand-copy">
          <h1>{EXAM_TITLE}</h1>
          <p className="subtitle">منصة تجريبية محلية لإدارة الامتحانات والمراجعة.</p>
        </div>
        {screen !== 'admin' && screen !== 'admin-login' && (
          <button type="button" className="header-link" onClick={openAdminLogin}>دخول الإدارة</button>
        )}
      </header>

      {screen === 'login' && <section className="card">
        <h2>دخول الطالب</h2>
        <form onSubmit={handleLogin} className="form-grid">
          <label>الاسم الكامل<input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="مثال: أحمد محمد" /></label>
          <label>الرقم الجامعي<input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="مثال: 202401234" inputMode="numeric" /></label>
          {formError && <p className="error">{formError}</p>}
          <button type="submit" className="primary-btn">متابعة</button>
        </form>
      </section>}

      {screen === 'admin-login' && <section className="card admin-login-card">
        <h2>دخول لوحة الإدارة</h2>
        <p className="meta">هذه بيانات تجريبية محلية فقط وليست مصادقة إنتاجية.</p>
        <form onSubmit={handleAdminLogin} className="form-grid">
          <label>اسم المستخدم<input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} autoComplete="username" /></label>
          <label>كلمة المرور<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" /></label>
          {adminError && <p className="error">{adminError}</p>}
          <div className="demo-credentials"><strong>الحساب التجريبي:</strong> admin / east-nile-demo</div>
          <div className="actions-row"><button type="submit" className="primary-btn">دخول</button><button type="button" className="secondary-btn" onClick={() => setScreen('login')}>عودة للطالب</button></div>
        </form>
      </section>}

      {screen === 'admin' && <section className="admin-shell">
        <div className="admin-toolbar"><div><h2>لوحة الإدارة</h2><p className="subtitle">إدارة المحاولات والتصحيح المحلي</p></div><button type="button" className="secondary-btn" onClick={logoutAdmin}>تسجيل الخروج</button></div>
        {notice && <p className="success notice">{notice}</p>}
        <div className="stats-grid"><div className="stat-card"><strong>{submissions.length}</strong><span>إجمالي المحاولات</span></div><div className="stat-card"><strong>{pendingCount}</strong><span>تحتاج مراجعة</span></div><div className="stat-card"><strong>{objectiveTotal}</strong><span>إجمالي درجات الامتحان</span></div><div className="stat-card"><strong>{new Set(submissions.map((item) => item.studentId)).size}</strong><span>الطلاب</span></div></div>
        <div className="card"><div className="section-heading"><h3>المحاولات المسجلة</h3><button type="button" className="secondary-btn" onClick={() => setSubmissions(readSubmissions())}>تحديث</button></div>
          {submissions.length === 0 ? <p className="meta">لا توجد محاولات بعد. أرسل امتحانًا من واجهة الطالب لتظهر هنا.</p> : <div className="table-wrap"><table><thead><tr><th>الطالب</th><th>الرقم الجامعي</th><th>رقم المحاولة</th><th>التاريخ</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td>{submission.studentName}</td><td>{submission.studentId}</td><td>{submission.attemptNumber}</td><td>{submission.submittedAt}</td><td><span className={submission.published ? 'status published' : 'status pending'}>{submission.status}</span></td><td><button type="button" className="secondary-btn small-btn" onClick={() => reviewSubmission(submission)}>مراجعة</button>{!submission.published && <button type="button" className="primary-btn small-btn" onClick={() => publishSubmission(submission)}>نشر</button>}</td></tr>)}</tbody></table></div>}
        </div>
        {selectedSubmission && <div className="card review-panel"><div className="section-heading"><h3>مراجعة محاولة {selectedSubmission.attemptNumber}</h3><button type="button" className="secondary-btn" onClick={() => setSelectedSubmission(null)}>إغلاق</button></div><p><strong>الطالب:</strong> {selectedSubmission.studentName} — {selectedSubmission.studentId}</p><div className="answer-list">{EXAM_QUESTIONS.map((question) => <div className="answer-card" key={question.id}><h4>{question.question}</h4><p>إجابة الطالب: <strong>{selectedSubmission.answers?.[question.id] || 'بدون إجابة'}</strong></p><p>الدرجة التلقائية: {selectedSubmission.answers?.[question.id] === question.correctAnswer ? question.points : 0} / {question.points}</p></div>)}</div><label>درجة المراجعة اليدوية للأسئلة المقالية<input type="number" min="0" max="0" value={selectedSubmission.editedManualScore} onChange={(event) => setSelectedSubmission((prev) => ({ ...prev, editedManualScore: event.target.value }))} /></label><p className="meta">لا توجد أسئلة مقالية في النموذج التجريبي الحالي؛ الحقل محفوظ للتوسع القادم.</p><label>تعليق المدرس<textarea value={selectedSubmission.editedComment} onChange={(event) => setSelectedSubmission((prev) => ({ ...prev, editedComment: event.target.value }))} rows="3" /></label><button type="button" className="primary-btn" onClick={saveReview}>حفظ التصحيح</button></div>}
      </section>}

      {screen === 'instructions' && <section className="card"><h2>تعليمات الامتحان</h2><ul className="instructions"><li>المدة: {Math.round(EXAM_DURATION_SECONDS / 60)} دقيقة.</li><li>سيظهر سؤال واحد في كل مرة ويمكن التنقل بين الأسئلة.</li><li>يتم حفظ إجاباتك محليًا داخل هذا المتصفح أثناء الامتحان.</li><li>لن يتم عرض الدرجة بعد التسليم إلا بعد اعتمادها من الإدارة.</li></ul><div className="meta"><strong>الطالب:</strong> {studentName} — {studentId}</div><button type="button" className="primary-btn" onClick={startExam}>بدء الامتحان</button></section>}

      {screen === 'exam' && <section className="card exam-mode" onCopy={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()}><div className="exam-top"><p><strong>{EXAM_SUBJECT}</strong></p><p>المتبقي: {formatTime(remainingSeconds)}</p></div><div className="progress-wrap" aria-label="شريط تقدم الامتحان"><div className="progress-bar" style={{ width: `${progress}%` }} /></div><p className="question-index">السؤال {currentQuestionIndex + 1} من {totalQuestions}</p><h3>{examQuestion.question}</h3><div className="options">{examQuestion.options.map((option) => <button key={option} type="button" className={`option-btn ${answers[examQuestion.id] === option ? 'selected' : ''}`} onClick={() => saveAnswer(option)}>{option}</button>)}</div><div className="actions-row"><button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}>السابق</button><button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1))}>التالي</button><button type="button" className="danger-btn" onClick={() => handleSubmit()}>تسليم الامتحان</button></div><p className="meta">الإجابات المسجلة: {answeredCount} / {totalQuestions}</p><p className="warning-note">تنبيه: هذه مؤشرات حماية واجهة فقط ولا تضمن منع الغش بشكل كامل دون حماية من جهة الخادم.</p>{submitStatus === 'error' && <p className="error">{submitError}</p>}{submitStatus === 'submitting' && <p className="loading">جارٍ حفظ المحاولة...</p>}</section>}

      {screen === 'submitted' && <section className="card"><h2>تم استلام المحاولة</h2><p className="success">{submitMessage}</p><p><strong>اسم الطالب:</strong> {studentName}</p><p><strong>الرقم الجامعي:</strong> {studentId}</p><p><strong>رقم المحاولة:</strong> {attemptNumber}</p><p>حالتك الآن: <strong>قيد المراجعة</strong> — النتيجة لا تُعرض حتى تعتمدها الإدارة.</p><button type="button" className="primary-btn" onClick={() => setScreen('review')}>فتح شاشة المراجعة التجريبية</button></section>}

      {screen === 'review' && <section className="card"><h2>مراجعة المحاولة</h2><p>تم حفظ المحاولة محليًا. يمكن للمسؤول فتح لوحة الإدارة ومراجعتها من نفس المتصفح.</p><div className="review-box"><p><strong>الطالب:</strong> {studentName} — {studentId}</p><p><strong>رقم المحاولة:</strong> {attemptNumber}</p><p><strong>الحالة:</strong> قيد المراجعة</p></div><button type="button" className="secondary-btn" onClick={() => setScreen('login')}>العودة للصفحة الرئيسية</button></section>}
    </main>
  )
}

export default App
