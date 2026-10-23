import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  draft: 'east-nile-exam-draft',
  submissions: 'east-nile-exam-submissions',
  adminSession: 'east-nile-admin-session',
  exams: 'east-nile-exams',
}

const EXAM_TITLE = 'نظام امتحانات كلية شرق النيل'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'east-nile-demo'

const DEFAULT_EXAM = {
  id: 'exam-computer-basics',
  title: 'اختبار تجريبي - مهارات الحاسوب',
  description: 'اختبار تجريبي في أساسيات أمن المعلومات والحفاظ على البيانات.',
  durationMinutes: 15,
  status: 'open',
  questions: [
    { id: 'q-1', type: 'multiple_choice', question: 'ما أفضل وصف لغرض كلمة المرور القوية؟', options: ['تسهيل مشاركة الحساب مع الأصدقاء', 'حماية الحساب من الوصول غير المصرح به', 'تسريع اتصال الإنترنت', 'استبدال النسخ الاحتياطي للبيانات'], correctAnswer: 'حماية الحساب من الوصول غير المصرح به', points: 1 },
    { id: 'q-2', type: 'multiple_choice', question: 'عند استلام ملف من مصدر غير معروف، ما الإجراء الأكثر أمانًا؟', options: ['فتحه مباشرة ثم حذفه لاحقًا', 'مشاركته مع زملاء الصف', 'فحصه بمضاد فيروسات قبل الاستخدام', 'إيقاف تحديثات النظام'], correctAnswer: 'فحصه بمضاد فيروسات قبل الاستخدام', points: 1 },
    { id: 'q-3', type: 'multiple_choice', question: 'أي خيار يساعد على حماية بياناتك أثناء انقطاع الكهرباء؟', options: ['إلغاء الحفظ التلقائي', 'حفظ العمل بشكل دوري واستخدام نسخة احتياطية', 'ترك الجهاز دائمًا بدون كلمة مرور', 'تعطيل التحديثات الأمنية'], correctAnswer: 'حفظ العمل بشكل دوري واستخدام نسخة احتياطية', points: 1 },
  ],
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function readExams() {
  const exams = readJson(STORAGE_KEYS.exams, null)
  return Array.isArray(exams) && exams.length ? exams : [DEFAULT_EXAM]
}

function nowLabel() {
  return new Date().toLocaleString('ar-SD', { hour12: false })
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatTime(totalSeconds) {
  const safe = Math.max(totalSeconds, 0)
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`
}

function emptyQuestion() {
  return { id: generateId('question'), type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }
}

function App() {
  const [screen, setScreen] = useState('login')
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [formError, setFormError] = useState('')
  const [exams, setExams] = useState(readExams)
  const [activeExam, setActiveExam] = useState(() => readExams().find((exam) => exam.status === 'open') || readExams()[0])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [attemptNumber, setAttemptNumber] = useState('')
  const [startTime, setStartTime] = useState('')
  const [focusEvents, setFocusEvents] = useState([])
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminView, setAdminView] = useState('dashboard')
  const [submissions, setSubmissions] = useState(() => readJson(STORAGE_KEYS.submissions, []))
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [notice, setNotice] = useState('')
  const [editingExam, setEditingExam] = useState(null)
  const [examError, setExamError] = useState('')

  const questions = activeExam?.questions || []
  const examDurationSeconds = (activeExam?.durationMinutes || 15) * 60
  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const progress = questions.length ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0
  const pendingCount = submissions.filter((submission) => !submission.published).length
  const totalPoints = questions.reduce((sum, question) => sum + Number(question.points || 0), 0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.exams, JSON.stringify(exams))
  }, [exams])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.adminSession) === 'true') setScreen('admin')
  }, [])

  const openAdminLogin = () => { setAdminError(''); setScreen('admin-login') }

  const handleAdminLogin = (event) => {
    event.preventDefault()
    if (adminUsername.trim() === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEYS.adminSession, 'true')
      setScreen('admin')
      setSubmissions(readJson(STORAGE_KEYS.submissions, []))
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
    const availableExam = exams.find((exam) => exam.status === 'open')
    if (!cleanedName || !cleanedId) return setFormError('يرجى إدخال اسم الطالب والرقم الجامعي قبل المتابعة.')
    if (!/^\d{5,15}$/.test(cleanedId)) return setFormError('الرقم الجامعي يجب أن يحتوي على أرقام فقط (5 إلى 15 رقمًا).')
    if (!availableExam || !availableExam.questions.length) return setFormError('لا يوجد امتحان مفتوح ومجهز حاليًا.')
    setActiveExam(availableExam)
    const draft = readJson(STORAGE_KEYS.draft, null)
    if (draft?.studentId === cleanedId && draft?.studentName === cleanedName && draft.examId === availableExam.id) {
      setAnswers(draft.answers || {})
      setCurrentQuestionIndex(draft.currentQuestionIndex || 0)
      setRemainingSeconds(draft.remainingSeconds || availableExam.durationMinutes * 60)
      setAttemptNumber(draft.attemptNumber || generateId('EN'))
      setStartTime(draft.startTime || nowLabel())
    } else {
      setAnswers({})
      setCurrentQuestionIndex(0)
      setRemainingSeconds(availableExam.durationMinutes * 60)
      setAttemptNumber('')
      setStartTime('')
    }
    setFormError('')
    setStudentName(cleanedName)
    setStudentId(cleanedId)
    setScreen('instructions')
  }

  const startExam = () => {
    if (!attemptNumber) setAttemptNumber(generateId('EN'))
    if (!startTime) setStartTime(nowLabel())
    setScreen('exam')
  }

  const saveAnswer = (answer) => {
    if (!currentQuestion) return
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: answer }))
  }

  const handleSubmit = useCallback(async (message = 'تم تسليم المحاولة بنجاح.') => {
    if (submitStatus === 'submitting' || submitStatus === 'done' || !activeExam) return
    setSubmitStatus('submitting')
    try {
      const submission = {
        id: generateId('submission'), attemptNumber, examId: activeExam.id, examTitle: activeExam.title,
        questions: activeExam.questions, studentName, studentId, startTime, submittedAt: nowLabel(), answers, focusEvents,
        status: 'قيد المراجعة', objectiveScore: null, manualScore: 0, totalScore: null, comment: '', published: false,
      }
      const next = [...readJson(STORAGE_KEYS.submissions, []), submission]
      localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(next))
      localStorage.removeItem(STORAGE_KEYS.draft)
      setSubmissions(next)
      await new Promise((resolve) => window.setTimeout(resolve, 500))
      setSubmitStatus('done')
      setSubmitMessage(message)
      setScreen('submitted')
    } catch {
      setSubmitStatus('error')
      setSubmitError('تعذر حفظ المحاولة محليًا. حاول مرة أخرى.')
    }
  }, [activeExam, answers, attemptNumber, focusEvents, startTime, studentId, studentName, submitStatus])

  useEffect(() => {
    if (screen !== 'exam') return undefined
    const timer = window.setInterval(() => setRemainingSeconds((previous) => {
      if (previous <= 1) { handleSubmit('انتهى الوقت وتم إرسال المحاولة تلقائيًا.'); return 0 }
      return previous - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [handleSubmit, screen])

  useEffect(() => {
    if (screen !== 'exam' || !studentId || !activeExam) return
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify({ examId: activeExam.id, studentName, studentId, currentQuestionIndex, answers, remainingSeconds, attemptNumber, startTime }))
  }, [activeExam, answers, attemptNumber, currentQuestionIndex, remainingSeconds, screen, startTime, studentId, studentName])

  useEffect(() => {
    if (screen !== 'exam') return undefined
    const register = (label) => setFocusEvents((previous) => [...previous, { label, time: nowLabel() }])
    const visibility = () => document.hidden && register('تبديل التبويب أو إخفاء نافذة الامتحان')
    const blur = () => register('الخروج من وضع التركيز')
    const focus = () => register('العودة إلى الامتحان')
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('focus', focus)
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus) }
  }, [screen])

  const calculateObjectiveScore = (submission) => (submission.questions || []).reduce((sum, question) => {
    if (question.type === 'essay') return sum
    const answer = submission.answers?.[question.id]
    return sum + (answer === question.correctAnswer ? Number(question.points || 0) : 0)
  }, 0)

  const reviewSubmission = (submission) => setSelectedSubmission({ ...submission, editedManualScore: submission.manualScore || 0, editedComment: submission.comment || '' })

  const saveReview = () => {
    if (!selectedSubmission) return
    const essayMax = (selectedSubmission.questions || []).filter((question) => question.type === 'essay').reduce((sum, question) => sum + Number(question.points || 0), 0)
    const manualScore = Math.min(Math.max(Number(selectedSubmission.editedManualScore) || 0, 0), essayMax)
    const updated = submissions.map((item) => item.id === selectedSubmission.id ? { ...item, objectiveScore: calculateObjectiveScore(selectedSubmission), manualScore, totalScore: calculateObjectiveScore(selectedSubmission) + manualScore, comment: selectedSubmission.editedComment, status: 'تم التصحيح' } : item)
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(updated)); setSubmissions(updated); setSelectedSubmission(null); setNotice('تم حفظ التصحيح بنجاح.')
  }

  const publishSubmission = (submission) => {
    const objectiveScore = submission.objectiveScore ?? calculateObjectiveScore(submission)
    const updated = submissions.map((item) => item.id === submission.id ? { ...item, objectiveScore, totalScore: objectiveScore + Number(item.manualScore || 0), status: 'تم نشر النتيجة', published: true, publishedAt: nowLabel() } : item)
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(updated)); setSubmissions(updated); setNotice('تم نشر النتيجة للطالب.')
  }

  const startNewExam = () => {
    setExamError('')
    setEditingExam({ id: generateId('exam'), title: '', description: '', durationMinutes: 30, status: 'draft', questions: [] })
    setAdminView('exam-editor')
  }

  const editExam = (exam) => { setExamError(''); setEditingExam(JSON.parse(JSON.stringify(exam))); setAdminView('exam-editor') }

  const updateEditingExam = (field, value) => setEditingExam((previous) => ({ ...previous, [field]: value }))

  const updateQuestion = (questionIndex, field, value) => setEditingExam((previous) => ({ ...previous, questions: previous.questions.map((question, index) => index === questionIndex ? { ...question, [field]: value } : question) }))

  const updateOption = (questionIndex, optionIndex, value) => setEditingExam((previous) => ({ ...previous, questions: previous.questions.map((question, index) => index === questionIndex ? { ...question, options: question.options.map((option, optionPosition) => optionPosition === optionIndex ? value : option) } : question) }))

  const saveExam = (event) => {
    event.preventDefault()
    if (!editingExam.title.trim()) return setExamError('اكتب عنوان الامتحان أولًا.')
    if (!Number(editingExam.durationMinutes) || Number(editingExam.durationMinutes) < 1) return setExamError('مدة الامتحان يجب أن تكون دقيقة واحدة على الأقل.')
    if (!editingExam.questions.length) return setExamError('أضف سؤالًا واحدًا على الأقل.')
    for (const question of editingExam.questions) {
      if (!question.question.trim() || Number(question.points) < 1) return setExamError('كل سؤال يحتاج نصًا ودرجة صحيحة.')
      if (question.type !== 'essay' && (!question.options?.length || question.options.some((option) => !option.trim()) || !question.correctAnswer)) return setExamError('أسئلة الاختيار وصح/خطأ تحتاج اختيارات وإجابة صحيحة.')
    }
    const next = exams.some((exam) => exam.id === editingExam.id) ? exams.map((exam) => exam.id === editingExam.id ? editingExam : exam) : [...exams, editingExam]
    setExams(next); setEditingExam(null); setAdminView('exams'); setNotice('تم حفظ الامتحان وأسئلته.')
  }

  const deleteExam = (exam) => {
    if (exam.id === DEFAULT_EXAM.id) return setNotice('لا يمكن حذف الامتحان التجريبي الأساسي، يمكنك إغلاقه أو تعديله.')
    if (window.confirm(`هل تريد حذف «${exam.title}»؟`)) { setExams(exams.filter((item) => item.id !== exam.id)); setNotice('تم حذف الامتحان.') }
  }

  const toggleExamStatus = (exam) => {
    const status = exam.status === 'open' ? 'closed' : 'open'
    setExams(exams.map((item) => item.id === exam.id ? { ...item, status } : item))
  }

  const renderAdmin = () => {
    if (adminView === 'exam-editor' && editingExam) return <section className="card"><div className="section-heading"><h3>{editingExam.title ? 'تعديل الامتحان' : 'إنشاء امتحان جديد'}</h3><button type="button" className="secondary-btn" onClick={() => { setEditingExam(null); setAdminView('exams') }}>إلغاء</button></div><form className="form-grid" onSubmit={saveExam}><label>عنوان الامتحان<input value={editingExam.title} onChange={(event) => updateEditingExam('title', event.target.value)} /></label><label>الوصف<textarea rows="2" value={editingExam.description} onChange={(event) => updateEditingExam('description', event.target.value)} /></label><div className="form-two-columns"><label>المدة بالدقائق<input type="number" min="1" value={editingExam.durationMinutes} onChange={(event) => updateEditingExam('durationMinutes', event.target.value)} /></label><label>الحالة<select value={editingExam.status} onChange={(event) => updateEditingExam('status', event.target.value)}><option value="draft">مسودة</option><option value="open">مفتوح</option><option value="closed">مغلق</option></select></label></div><div className="section-heading"><h3>الأسئلة ({editingExam.questions.length})</h3><button type="button" className="secondary-btn" onClick={() => setEditingExam((previous) => ({ ...previous, questions: [...previous.questions, emptyQuestion()] }))}>إضافة سؤال</button></div>{editingExam.questions.map((question, questionIndex) => <div className="question-editor" key={question.id}><div className="section-heading"><strong>السؤال {questionIndex + 1}</strong><button type="button" className="danger-btn small-btn" onClick={() => setEditingExam((previous) => ({ ...previous, questions: previous.questions.filter((_, index) => index !== questionIndex) }))}>حذف</button></div><label>نص السؤال<textarea rows="2" value={question.question} onChange={(event) => updateQuestion(questionIndex, 'question', event.target.value)} /></label><div className="form-two-columns"><label>النوع<select value={question.type} onChange={(event) => { const type = event.target.value; updateQuestion(questionIndex, 'type', type); if (type === 'true_false') { updateQuestion(questionIndex, 'options', ['صح', 'خطأ']); updateQuestion(questionIndex, 'correctAnswer', 'صح') } }}>{<><option value="multiple_choice">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option><option value="essay">مقالي</option></>}</select></label><label>الدرجة<input type="number" min="1" value={question.points} onChange={(event) => updateQuestion(questionIndex, 'points', event.target.value)} /></label></div>{question.type !== 'essay' && <><label>الإجابة الصحيحة<select value={question.correctAnswer} onChange={(event) => updateQuestion(questionIndex, 'correctAnswer', event.target.value)}><option value="">اختر الإجابة الصحيحة</option>{question.options.map((option, optionIndex) => <option key={`${question.id}-correct-${optionIndex}`} value={option}>{option || `اختيار ${optionIndex + 1}`}</option>)}</select></label>{question.type === 'multiple_choice' && question.options.map((option, optionIndex) => <label key={`${question.id}-option-${optionIndex}`}>الاختيار {optionIndex + 1}<input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} /></label>)}</>}</div>)}{examError && <p className="error">{examError}</p>}<button type="submit" className="primary-btn">حفظ الامتحان</button></form></section>

    if (adminView === 'exams') return <section className="card"><div className="section-heading"><h3>إدارة الامتحانات والأسئلة</h3><button type="button" className="primary-btn" onClick={startNewExam}>إنشاء امتحان</button></div>{exams.map((exam) => <div className="exam-admin-card" key={exam.id}><div><h3>{exam.title}</h3><p>{exam.description || 'بدون وصف'}</p><span className={`status ${exam.status === 'open' ? 'published' : 'pending'}`}>{exam.status === 'open' ? 'مفتوح' : exam.status === 'draft' ? 'مسودة' : 'مغلق'}</span><span className="exam-detail">{exam.questions.length} أسئلة · {exam.durationMinutes} دقيقة · {exam.questions.reduce((sum, question) => sum + Number(question.points || 0), 0)} درجات</span></div><div className="actions-row"><button type="button" className="secondary-btn small-btn" onClick={() => editExam(exam)}>تعديل والأسئلة</button><button type="button" className="secondary-btn small-btn" onClick={() => toggleExamStatus(exam)}>{exam.status === 'open' ? 'إغلاق' : 'فتح'}</button><button type="button" className="danger-btn small-btn" onClick={() => deleteExam(exam)}>حذف</button></div></div>)}</section>

    return <><div className="stats-grid"><div className="stat-card"><strong>{exams.length}</strong><span>الامتحانات</span></div><div className="stat-card"><strong>{submissions.length}</strong><span>إجمالي المحاولات</span></div><div className="stat-card"><strong>{pendingCount}</strong><span>تحتاج مراجعة</span></div><div className="stat-card"><strong>{new Set(submissions.map((item) => item.studentId)).size}</strong><span>الطلاب</span></div></div><section className="card"><div className="section-heading"><h3>المحاولات المسجلة</h3><button type="button" className="secondary-btn" onClick={() => setSubmissions(readJson(STORAGE_KEYS.submissions, []))}>تحديث</button></div>{submissions.length === 0 ? <p className="meta">لا توجد محاولات بعد.</p> : <div className="table-wrap"><table><thead><tr><th>الطالب</th><th>الامتحان</th><th>التاريخ</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td>{submission.studentName}<br /><small>{submission.studentId}</small></td><td>{submission.examTitle}</td><td>{submission.submittedAt}</td><td><span className={`status ${submission.published ? 'published' : 'pending'}`}>{submission.status}</span></td><td><button type="button" className="secondary-btn small-btn" onClick={() => reviewSubmission(submission)}>مراجعة</button>{!submission.published && <button type="button" className="primary-btn small-btn" onClick={() => publishSubmission(submission)}>نشر</button>}</td></tr>)}</tbody></table></div>}</section>{selectedSubmission && <section className="card review-panel"><div className="section-heading"><h3>مراجعة محاولة {selectedSubmission.attemptNumber}</h3><button type="button" className="secondary-btn" onClick={() => setSelectedSubmission(null)}>إغلاق</button></div><p><strong>الطالب:</strong> {selectedSubmission.studentName} — {selectedSubmission.studentId}</p>{(selectedSubmission.questions || []).map((question) => <div className="answer-card" key={question.id}><h4>{question.question}</h4><p>إجابة الطالب: <strong>{selectedSubmission.answers?.[question.id] || 'بدون إجابة'}</strong></p><p>{question.type === 'essay' ? `الدرجة القصوى: ${question.points}` : `الدرجة التلقائية: ${selectedSubmission.answers?.[question.id] === question.correctAnswer ? question.points : 0} / ${question.points}`}</p></div>)}<label>مجموع درجات الأسئلة المقالية<input type="number" min="0" value={selectedSubmission.editedManualScore} onChange={(event) => setSelectedSubmission((previous) => ({ ...previous, editedManualScore: event.target.value }))} /></label><label>تعليق المدرس<textarea rows="3" value={selectedSubmission.editedComment} onChange={(event) => setSelectedSubmission((previous) => ({ ...previous, editedComment: event.target.value }))} /></label><button type="button" className="primary-btn" onClick={saveReview}>حفظ التصحيح</button></section>}</>
  }

  return <main className="layout" dir="rtl" lang="ar"><header className="brand-card"><img src="/college-logo-placeholder.svg" alt="مكان شعار كلية شرق النيل" className="college-logo" /><div className="brand-copy"><h1>{EXAM_TITLE}</h1><p className="subtitle">منصة تجريبية محلية لإدارة الامتحانات والمراجعة.</p></div>{screen !== 'admin' && screen !== 'admin-login' && <button type="button" className="header-link" onClick={openAdminLogin}>دخول الإدارة</button>}</header>
    {screen === 'login' && <section className="card"><h2>دخول الطالب</h2><form onSubmit={handleLogin} className="form-grid"><label>الاسم الكامل<input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="مثال: أحمد محمد" /></label><label>الرقم الجامعي<input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="مثال: 202401234" inputMode="numeric" /></label>{formError && <p className="error">{formError}</p>}<button type="submit" className="primary-btn">متابعة</button></form></section>}
    {screen === 'admin-login' && <section className="card"><h2>دخول لوحة الإدارة</h2><p className="meta">بيانات تجريبية محلية فقط.</p><form onSubmit={handleAdminLogin} className="form-grid"><label>اسم المستخدم<input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></label><label>كلمة المرور<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>{adminError && <p className="error">{adminError}</p>}<div className="demo-credentials"><strong>الحساب:</strong> admin / east-nile-demo</div><div className="actions-row"><button type="submit" className="primary-btn">دخول</button><button type="button" className="secondary-btn" onClick={() => setScreen('login')}>عودة</button></div></form></section>}
    {screen === 'admin' && <section className="admin-shell"><div className="admin-toolbar"><div><h2>لوحة الإدارة</h2><p className="subtitle">إدارة الامتحانات والأسئلة والمحاولات</p></div><button type="button" className="secondary-btn" onClick={logoutAdmin}>تسجيل الخروج</button></div><nav className="admin-nav"><button className={adminView === 'dashboard' ? 'active' : ''} onClick={() => { setAdminView('dashboard'); setEditingExam(null) }}>الرئيسية</button><button className={adminView === 'exams' || adminView === 'exam-editor' ? 'active' : ''} onClick={() => { setAdminView('exams'); setEditingExam(null) }}>الامتحانات والأسئلة</button></nav>{notice && <p className="success notice">{notice}</p>}{renderAdmin()}</section>}
    {screen === 'instructions' && <section className="card"><h2>تعليمات الامتحان</h2><p className="meta"><strong>{activeExam.title}</strong> · المدة: {activeExam.durationMinutes} دقيقة · الأسئلة: {activeExam.questions.length}</p><ul className="instructions"><li>سيظهر سؤال واحد في كل مرة.</li><li>يتم حفظ إجاباتك محليًا في هذا المتصفح.</li><li>لن تظهر الدرجة قبل مراجعة الإدارة ونشرها.</li></ul><div className="meta"><strong>الطالب:</strong> {studentName} — {studentId}</div><button type="button" className="primary-btn" onClick={startExam}>بدء الامتحان</button></section>}
    {screen === 'exam' && currentQuestion && <section className="card exam-mode" onCopy={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()}><div className="exam-top"><p><strong>{activeExam.title}</strong></p><p>المتبقي: {formatTime(remainingSeconds)}</p></div><div className="progress-wrap"><div className="progress-bar" style={{ width: `${progress}%` }} /></div><p className="question-index">السؤال {currentQuestionIndex + 1} من {questions.length} · الدرجة: {currentQuestion.points}</p><h3>{currentQuestion.question}</h3>{currentQuestion.type === 'essay' ? <textarea rows="8" value={answers[currentQuestion.id] || ''} onChange={(event) => saveAnswer(event.target.value)} placeholder="اكتب إجابتك هنا..." /> : <div className="options">{currentQuestion.options.map((option) => <button key={option} type="button" className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`} onClick={() => saveAnswer(option)}>{option}</button>)}</div>}<div className="actions-row"><button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((previous) => Math.max(previous - 1, 0))}>السابق</button><button type="button" className="secondary-btn" onClick={() => setCurrentQuestionIndex((previous) => Math.min(previous + 1, questions.length - 1))}>التالي</button><button type="button" className="danger-btn" onClick={() => handleSubmit()}>تسليم الامتحان</button></div><p className="meta">الإجابات المسجلة: {answeredCount} / {questions.length}</p>{submitStatus === 'error' && <p className="error">{submitError}</p>}{submitStatus === 'submitting' && <p className="loading">جارٍ حفظ المحاولة...</p>}</section>}
    {screen === 'submitted' && <section className="card"><h2>تم استلام المحاولة</h2><p className="success">{submitMessage}</p><p><strong>الطالب:</strong> {studentName}</p><p><strong>الامتحان:</strong> {activeExam.title}</p><p><strong>رقم المحاولة:</strong> {attemptNumber}</p><p>الحالة: <strong>قيد المراجعة</strong> — ستظهر النتيجة بعد اعتمادها ونشرها.</p><button type="button" className="primary-btn" onClick={() => setScreen('review')}>مراجعة الحالة</button></section>}
    {screen === 'review' && <section className="card"><h2>مراجعة المحاولة</h2><p>تم حفظ المحاولة محليًا، ويمكن للمسؤول مراجعتها من لوحة الإدارة.</p><div className="review-box"><p><strong>الطالب:</strong> {studentName} — {studentId}</p><p><strong>الامتحان:</strong> {activeExam.title}</p><p><strong>الحالة:</strong> قيد المراجعة</p></div><button type="button" className="secondary-btn" onClick={() => setScreen('login')}>العودة</button></section>}
  </main>
}

export default App
