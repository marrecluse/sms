// frontend/src/pages/student/StudentQuizzes.jsx
import { useState, useEffect, useRef } from 'react';
import { quizzesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Clock, CheckCircle, Play, Trophy } from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

export default function StudentQuizzes() {
  const [quizzes, setQuizzes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [active, setActive]         = useState(null);
  const [answers, setAnswers]       = useState({});
  const [timeLeft, setTimeLeft]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const load = () => {
    quizzesAPI.list().then(r => setQuizzes(r.data))
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); return () => clearInterval(timerRef.current); }, []);

  const startQuiz = async (quiz) => {
    try {
      const r = await quizzesAPI.attempt(quiz.id);
      setActive({ attemptId: r.data.attempt_id, questions: r.data.questions, quiz });
      setAnswers({});
      const seconds = quiz.duration_minutes * 60;
      setTimeLeft(seconds);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); handleSubmit(r.data.attempt_id, r.data.questions); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start quiz');
    }
  };

  const handleSubmit = async (attemptId, questions) => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    const aId = attemptId || active?.attemptId;
    const qs  = questions || active?.questions || [];
    const ans = qs.map(q => ({ question_id: q.id, answer: answers[q.id] || '' }));
    try {
      const r = await quizzesAPI.submit({ attempt_id: aId, answers: ans });
      toast.success(`Quiz submitted! Score: ${r.data.marks_obtained}`);
      setActive(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const now = new Date();
  // Quizzes with no start_time are treated as immediately available
  const available = quizzes.filter(q => !q.attempt_id && (!q.start_time || isBefore(parseISO(q.start_time), now)) && (!q.end_time || isAfter(parseISO(q.end_time), now)));
  const upcoming  = quizzes.filter(q => !q.attempt_id && q.start_time && isAfter(parseISO(q.start_time), now));
  const completed = quizzes.filter(q => q.attempt_id && q.attempt_status === 'submitted');

  if (active) {
    const pct = active.questions.length > 0 ? Math.round((Object.keys(answers).length / active.questions.length) * 100) : 0;
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">{active.quiz.title}</h2>
            <p className="text-sm text-gray-500">{active.quiz.course_name} · {active.questions.length} questions</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-mono font-bold ${timeLeft < 120 ? 'text-red-600' : 'text-gray-800'}`}>{fmtTime(timeLeft)}</p>
            <p className="text-xs text-gray-400">remaining</p>
          </div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-gray-500 text-right">{Object.keys(answers).length} / {active.questions.length} answered</p>

        {active.questions.map((q, i) => (
          <div key={q.id} className={`bg-white rounded-xl border shadow-sm p-5 ${answers[q.id] ? 'border-blue-200' : 'border-gray-100'}`}>
            <p className="font-medium text-gray-800 mb-4"><span className="text-blue-600 mr-2">Q{i+1}.</span>{q.question_text} <span className="text-xs text-gray-400">({q.marks} mark{q.marks>1?'s':''})</span></p>
            {q.question_type === 'mcq' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['a','b','c','d'].filter(k => q[`option_${k}`]).map(k => (
                  <button key={k}
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: k.toUpperCase() }))}
                    className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${answers[q.id] === k.toUpperCase() ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                    <span className="font-semibold mr-2">{k.toUpperCase()}.</span>{q[`option_${k}`]}
                  </button>
                ))}
              </div>
            )}
            {q.question_type === 'true_false' && (
              <div className="flex gap-3">
                {['True','False'].map(v => (
                  <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                    className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${answers[q.id] === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                    {v}
                  </button>
                ))}
              </div>
            )}
            {q.question_type === 'short' && (
              <textarea rows={2} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Type your answer..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            )}
          </div>
        ))}

        <button onClick={() => handleSubmit()} disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Submitting...</> : <><CheckCircle className="w-4 h-4"/>Submit Quiz</>}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Quizzes</h1>
        <p className="text-gray-500 text-sm mt-1">{available.length} available now</p>
      </div>

      {available.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Play className="w-3.5 h-3.5 text-green-600"/>Available Now</h2>
          <div className="grid gap-3">
            {available.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-green-200 shadow-sm p-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{q.title}</h3>
                  <p className="text-sm text-gray-500">{q.course_name} · {q.total_marks} marks · {q.duration_minutes} min</p>
                </div>
                <button onClick={() => startQuiz(q)} className="flex-shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Play className="w-3.5 h-3.5"/>Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-orange-500"/>Upcoming</h2>
          <div className="grid gap-3">
            {upcoming.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{q.title}</h3>
                  <p className="text-sm text-gray-500">{q.course_name} · Starts {format(parseISO(q.start_time), 'MMM d, h:mm a')}</p>
                </div>
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">Upcoming</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Trophy className="w-3.5 h-3.5 text-blue-500"/>Completed</h2>
          <div className="grid gap-3">
            {completed.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 opacity-80">
                <div>
                  <h3 className="font-semibold text-gray-700">{q.title}</h3>
                  <p className="text-sm text-gray-500">{q.course_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{q.marks_obtained ?? '?'} / {q.total_marks}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Submitted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>}
      {!loading && quizzes.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40"/>
          <p>No quizzes assigned yet</p>
        </div>
      )}
    </div>
  );
}