'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  text: string;
  type: 'yes-no' | 'text' | 'rating';
}

export default function CreateChemicalAssessmentPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('All');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'yes-no' | 'text' | 'rating'>('yes-no');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  function addQuestion() {
    if (!newQuestion.trim()) {
      alert('Please enter a question');
      return;
    }

    const question: Question = {
      id: Date.now().toString(),
      text: newQuestion,
      type: newQuestionType
    };

    setQuestions([...questions, question]);
    setNewQuestion('');
    setNewQuestionType('yes-no');
  }

  function removeQuestion(id: string) {
    setQuestions(questions.filter(q => q.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('chemical_assessments')
        .insert([
          {
            title,
            description,
            created_by: user.id,
            department,
            content: questions,
            status: 'active'
          }
        ]);

      if (error) throw error;

      setSuccess(true);
      setTitle('');
      setDescription('');
      setDepartment('All');
      setQuestions([]);

      setTimeout(() => {
        router.push('/dashboard/manager');
      }, 2000);
    } catch (err) {
      alert('Failed to create assessment. Please try again.');
      console.error(err);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f89939' }}>Assessment Created</h1>
          <p className="text-gray-600 mb-4">Your chemical assessment has been created successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/manager')}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#f89939' }}>Create Chemical Assessment</h1>
          <p className="text-gray-600 mb-6">Build a new chemical hazard assessment form</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Assessment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="e.g., Chemical Handling Safety Assessment"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="Brief description of what this assessment covers..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Assign To Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                disabled={loading}
              >
                <option value="All">All Departments</option>
                <option value="Administration">Administration</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>

            {/* Questions Section */}
            <div className="pt-6 border-t">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#f89939' }}>Assessment Questions</h2>

              {/* Add Question */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Add Question *</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-orange-500 mb-3"
                  placeholder="Enter your question..."
                  rows={2}
                  disabled={loading}
                />

                <div className="flex gap-3">
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value as 'yes-no' | 'text' | 'rating')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-orange-500"
                    disabled={loading}
                  >
                    <option value="yes-no">Yes/No</option>
                    <option value="text">Text Answer</option>
                    <option value="rating">Rating (1-5)</option>
                  </select>

                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={loading}
                    style={{ backgroundColor: '#f89939' }}
                    className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-gray-600 font-semibold">{questions.length} question(s) added:</p>
                  {questions.map((question, index) => (
                    <div key={question.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{index + 1}. {question.text}</p>
                        <p className="text-xs text-gray-500 mt-1">Type: {question.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || questions.length === 0}
              style={{ backgroundColor: '#f89939' }}
              className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Chemical Assessment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}