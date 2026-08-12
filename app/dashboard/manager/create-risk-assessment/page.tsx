'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface Question {
  id: string;
  text: string;
  type: 'yes-no' | 'text' | 'rating';
}

export default function CreateRiskAssessmentPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'yes-no' | 'text' | 'rating'>('yes-no');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    }
  }, [router]);

  function addQuestion() {
    if (!newQuestion.trim()) return;

    const question: Question = {
      id: Date.now().toString(),
      text: newQuestion,
      type: newQuestionType
    };

    setQuestions([...questions, question]);
    setNewQuestion('');
  }

  function removeQuestion(id: string) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title || questions.length === 0) {
      setError('Please enter a title and add at least one question');
      return;
    }

    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const { data, error: insertError } = await supabase
        .from('risk_assessments')
        .insert({
          title,
          description,
          department,
          created_by: userData.id,
          content: questions,
          status: 'active'
        })
        .select();

      if (insertError) throw insertError;

      await logAudit(
        'assessment_created',
        userData.id,
        data[0].id,
        'risk_assessment',
        { title, department, questions_count: questions.length }
      );

      router.push('/dashboard/manager');
    } catch (err) {
      console.error('Error creating assessment:', err);
      setError('Failed to create assessment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#f89939' }}>Create Risk Assessment</h1>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 font-semibold">← Back</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Assessment Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="e.g., Warehouse Safety Assessment" required disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" placeholder="Brief description of the assessment" rows={3} disabled={loading} />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Department *</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black" disabled={loading}>
                <option value="Administration">Administration</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Questions</h3>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-black mb-3" placeholder="Add a question" disabled={loading} />
                <div className="flex gap-3 mb-3">
                  <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value as any)} className="flex-1 px-4 py-2 border rounded-lg text-black" disabled={loading}>
                    <option value="yes-no">Yes/No</option>
                    <option value="text">Text</option>
                    <option value="rating">Rating 1-5</option>
                  </select>
                  <button type="button" onClick={addQuestion} disabled={loading} style={{ backgroundColor: '#f89939' }} className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90">Add</button>
                </div>
              </div>

              {questions.length === 0 ? (
                <p className="text-gray-600">No questions added yet</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => (
                    <div key={q.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{q.text}</p>
                        <p className="text-xs text-gray-600">{q.type.replace('-', ' ').toUpperCase()}</p>
                      </div>
                      <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 font-semibold" disabled={loading}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || questions.length === 0} style={{ backgroundColor: '#f89939' }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Assessment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}