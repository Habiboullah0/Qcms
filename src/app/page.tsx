'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Sun, Moon, ChevronRight, ChevronLeft, Check, RotateCcw, Download, Clock } from 'lucide-react'
import { QuizData, QuizQuestion } from '@/types/quiz'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Suspense, lazy } from 'react'

// Lazy load components for better performance
const ResultsChart = lazy(() => import('@/components/ResultsChart'))
const ConfettiEffect = lazy(() => import('@/components/ConfettiEffect'))

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [quizzes, setQuizzes] = useState<Record<string, QuizData>>({})
  const [selectedQuiz, setSelectedQuiz] = useState<string>('digestif')
  const [loading, setLoading] = useState<boolean>(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([])
  const [showResults, setShowResults] = useState<boolean>(false)
  const [questionCount, setQuestionCount] = useState<number | 'all'>('all')
  const [customCount, setCustomCount] = useState<number>(10)
  const [showCustomCount, setShowCustomCount] = useState<boolean>(false)
  const [showExplanations, setShowExplanations] = useLocalStorage<boolean>('showExplanations', true)
  const [instantFeedback, setInstantFeedback] = useLocalStorage<boolean>('instantFeedback', false)
  const [timerActive, setTimerActive] = useState<boolean>(false)
  const [timerDuration, setTimerDuration] = useLocalStorage<number>('timerDuration', 10)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [highScores, setHighScores] = useLocalStorage<Record<string, number>>('quizHighScores_v3_fr', {})
  const [showConfetti, setShowConfetti] = useState<boolean>(false)
  const [isClient, setIsClient] = useState<boolean>(false)

  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Memoized function to get questions to show
  const getQuestionsToShow = useCallback(() => {
    if (!quizzes[selectedQuiz]) return []
    
    const allQuestions = quizzes[selectedQuiz].questions
    
    if (questionCount === 'all') return allQuestions
    
    const count = questionCount === 'custom' ? customCount : Number(questionCount)
    return allQuestions.slice(0, Math.min(count, allQuestions.length))
  }, [quizzes, selectedQuiz, questionCount, customCount])

  // Load quiz data
  useEffect(() => {
    const loadQuizData = async () => {
      setLoading(true)
      try {
        const quizTypes = ['digestif', 'cardiocirculatoire', 'respiration', 'embryologie']
        const loadedQuizzes: Record<string, QuizData> = {}
        
        // Use Promise.all for parallel loading
        await Promise.all(quizTypes.map(async (type) => {
          const response = await fetch(`/qcms/questions_${type}.json`)
          const data = await response.json()
          loadedQuizzes[type] = {
            ...data,
            category: type
          }
        }))
        
        setQuizzes(loadedQuizzes)
        setLoading(false)
      } catch (error) {
        console.error('Error loading quiz data:', error)
        setLoading(false)
      }
    }
    
    loadQuizData()
  }, [])

  // Initialize user answers when quiz changes or question count changes
  useEffect(() => {
    if (quizzes[selectedQuiz]) {
      const totalQuestions = getQuestionsToShow().length
      setUserAnswers(Array(totalQuestions).fill(null))
      setCurrentQuestionIndex(0)
      setShowResults(false)
      setShowConfetti(false)
    }
  }, [selectedQuiz, questionCount, customCount, quizzes, getQuestionsToShow])

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            handleCheckAnswers()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [timerActive, timeRemaining])

  const handleQuizChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQuiz(e.target.value)
  }

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setQuestionCount(value === 'all' ? 'all' : value === 'custom' ? 'custom' : Number(value))
    setShowCustomCount(value === 'custom')
  }

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...userAnswers]
    newAnswers[questionIndex] = optionIndex
    setUserAnswers(newAnswers)
    
    if (instantFeedback) {
      const questions = getQuestionsToShow()
      const isCorrect = questions[questionIndex].correctAnswer === optionIndex
      
      // Automatically move to next question after a short delay if correct
      if (isCorrect && questionIndex < questions.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex(questionIndex + 1)
        }, 1000)
      }
    }
  }

  const handlePrevQuestion = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1))
  }

  const handleNextQuestion = () => {
    const questions = getQuestionsToShow()
    setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))
  }

  const handleCheckAnswers = () => {
    setShowResults(true)
    setTimerActive(false)
    
    // Calculate score and save high score
    const questions = getQuestionsToShow()
    const correctCount = userAnswers.reduce((count, answer, index) => {
      return count + (answer === questions[index].correctAnswer ? 1 : 0)
    }, 0)
    
    const score = Math.round((correctCount / questions.length) * 100)
    
    // Update high score if better than previous
    const currentHighScore = highScores[selectedQuiz] || 0
    if (score > currentHighScore) {
      const newHighScores = { ...highScores, [selectedQuiz]: score }
      setHighScores(newHighScores)
      
      // Show confetti for new high score
      if (score >= 70) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    } else if (score >= 70) {
      // Show confetti for good score even if not a high score
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }

  const handleReset = () => {
    const questions = getQuestionsToShow()
    setUserAnswers(Array(questions.length).fill(null))
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setTimerActive(false)
    setTimeRemaining(0)
    setShowConfetti(false)
  }

  const handleStartTimer = () => {
    setTimeRemaining(timerDuration * 60)
    setTimerActive(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calculateProgress = () => {
    const answeredCount = userAnswers.filter(answer => answer !== null).length
    const totalQuestions = getQuestionsToShow().length
    return (answeredCount / totalQuestions) * 100
  }

  const handleExportResults = () => {
    const questions = getQuestionsToShow()
    const correctCount = userAnswers.reduce((count, answer, index) => {
      return count + (answer === questions[index].correctAnswer ? 1 : 0)
    }, 0)
    
    const score = Math.round((correctCount / questions.length) * 100)
    
    // Create results data
    const resultsData = {
      quiz: quizzes[selectedQuiz]?.title || selectedQuiz,
      date: new Date().toLocaleString(),
      score: `${score}%`,
      correct: correctCount,
      incorrect: userAnswers.filter((answer, index) => 
        answer !== null && answer !== questions[index].correctAnswer
      ).length,
      skipped: userAnswers.filter(answer => answer === null).length,
      totalQuestions: questions.length,
      details: questions.map((q, i) => ({
        question: q.question,
        userAnswer: userAnswers[i] !== null ? q.options[userAnswers[i]!] : 'Non répondu',
        correctAnswer: q.options[q.correctAnswer],
        isCorrect: userAnswers[i] === q.correctAnswer
      }))
    }
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Quiz,Date,Score,Correctes,Incorrectes,Sans réponse,Total\n';
    csvContent += `"${resultsData.quiz}","${resultsData.date}","${resultsData.score}",${resultsData.correct},${resultsData.incorrect},${resultsData.skipped},${resultsData.totalQuestions}\n\n`;
    csvContent += 'Question,Votre réponse,Réponse correcte,Résultat\n';
    
    resultsData.details.forEach(detail => {
      csvContent += `"${detail.question}","${detail.userAnswer}","${detail.correctAnswer}","${detail.isCorrect ? 'Correct' : 'Incorrect'}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quiz-results-${selectedQuiz}-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="quiz-container flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-xl text-primary">Chargement du quiz...</p>
      </div>
    )
  }

  const questions = getQuestionsToShow()
  const currentQuestion = questions[currentQuestionIndex]
  const quizData = quizzes[selectedQuiz]
  const progress = calculateProgress()
  const highScore = highScores[selectedQuiz] || 0

  // Calculate results for chart
  const correctCount = userAnswers.reduce((count, answer, index) => {
    return count + (answer === questions[index].correctAnswer ? 1 : 0)
  }, 0)
  
  const incorrectCount = userAnswers.filter((answer, index) => 
    answer !== null && answer !== questions[index].correctAnswer
  ).length
  
  const skippedCount = userAnswers.filter(answer => answer === null).length
  
  const score = Math.round((correctCount / questions.length) * 100)

  return (
    <main className="p-4">
      {isClient && showConfetti && (
        <Suspense fallback={null}>
          <ConfettiEffect />
        </Suspense>
      )}
      
      <motion.div 
        className="quiz-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center mb-8 pb-6 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center">
              <img src="/img/favicon.png" alt="Logo Quiz Médical" className="w-10 h-10 mr-2" />
              QCM
            </h1>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Changer de thème"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>

          <div className="quiz-settings bg-background rounded-xl p-4 mb-6 flex flex-wrap justify-center items-center gap-4 border border-border">
            <div className="setting-item flex items-center gap-2">
              <input 
                type="checkbox" 
                id="showExplanationsToggle" 
                className="checkbox" 
                checked={showExplanations}
                onChange={(e) => setShowExplanations(e.target.checked)}
              />
              <label htmlFor="showExplanationsToggle" className="text-sm md:text-base">
                Afficher les explications (après vérification)
              </label>
            </div>

            <div className="setting-item flex items-center gap-2">
              <input 
                type="checkbox" 
                id="instantFeedbackToggle" 
                className="checkbox"
                checked={instantFeedback}
                onChange={(e) => setInstantFeedback(e.target.checked)}
              />
              <label htmlFor="instantFeedbackToggle" className="text-sm md:text-base">
                Feedback instantané
              </label>
            </div>
          </div>

          <div className="quiz-selector-container bg-background rounded-xl p-4 border border-border">
            <label htmlFor="quizSelector" className="block font-semibold mb-2">Choisissez un quiz :</label>
            <select 
              id="quizSelector" 
              className="select w-full md:w-64 mb-3 text-center"
              value={selectedQuiz}
              onChange={handleQuizChange}
            >
              {Object.entries(quizzes).map(([id, quiz]) => (
                <option key={id} value={id}>{quiz.title}</option>
              ))}
            </select>
            <p className="text-muted-foreground text-sm mb-3">
              {quizData?.description || 'Description du quiz...'}
            </p>
            <p className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              Meilleur score : {highScore}%
            </p>

            <div className="question-count-selector mt-4 flex flex-wrap justify-center items-center gap-4">
              <label htmlFor="questionCountSelector" className="font-semibold">Nombre de questions :</label>
              <select 
                id="questionCountSelector" 
                className="select"
                value={questionCount === 'all' ? 'all' : questionCount === 'custom' ? 'custom' : questionCount.toString()}
                onChange={handleQuestionCountChange}
              >
                <option value="all">Toutes les questions</option>
                <option value="5">5 questions</option>
                <option value="10">10 questions</option>
                <option value="15">15 questions</option>
                <option value="20">20 questions</option>
                <option value="custom">Personnalisé</option>
              </select>
              {showCustomCount && (
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    id="customQuestionCount" 
                    min="1" 
                    max={quizData?.questions.length || 100} 
                    value={customCount}
                    onChange={(e) => setCustomCount(Number(e.target.value))}
                    className="input w-20" 
                    aria-label="Nombre personnalisé de questions" 
                  />
                  <button 
                    className="btn btn-secondary text-sm"
                    onClick={() => setQuestionCount('custom')}
                  >
                    Appliquer
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="timer-controls flex flex-col md:flex-row justify-between items-center gap-4 mb-6 p-4 bg-background rounded-xl border border-border">
          <div className={`flex items-center text-lg ${!timerActive ? 'hidden' : ''}`}>
            Temps restant : <span className="timer mx-2">{formatTime(timeRemaining)}</span>
          </div>
          <div className="timer-setting flex items-center gap-2">
            <label htmlFor="timerDurationInput" className="whitespace-nowrap">Durée (minutes) :</label>
            <input 
              type="number" 
              id="timerDurationInput" 
              value={timerDuration}
              onChange={(e) => setTimerDuration(Number(e.target.value))}
              min="1" 
              max="60" 
              step="1" 
              className="input w-16 text-center" 
              aria-label="Durée du minuteur en minutes" 
            />
            <button 
              className="btn bg-warning text-white hover:bg-warning/90 disabled:bg-muted-foreground"
              disabled={timerActive || showResults}
              onClick={handleStartTimer}
            >
              <Clock className="w-5 h-5" />
              <span>{timerActive ? 'En cours' : 'Démarrer'}</span>
            </button>
          </div>
        </div>

        <div className="progress-navigation-container p-4 mb-6 bg-background rounded-xl border border-border">
          <div className="progress-container h-3 mb-4 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Pourcentage de questions répondues"
            />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <button 
              className="btn btn-secondary w-full md:w-auto"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              aria-label="Question précédente"
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>
            <span className="px-4 py-1 bg-primary/10 text-primary rounded-full font-medium">
              Question {currentQuestionIndex + 1} / {questions.length}
            </span>
            <button 
              className="btn btn-secondary w-full md:w-auto"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
              aria-label="Question suivante"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[300px] relative transition-all duration-300">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4 bg-card rounded-xl border border-border mb-6"
              >
                <h2 className="text-xl font-semibold mb-4">{currentQuestion.question}</h2>
                
                {currentQuestion.image && (
                  <div className="mb-4">
                    <img 
                      src={currentQuestion.image} 
                      alt="Question illustration" 
                      className="max-w-full h-auto rounded-lg mx-auto"
                      loading="lazy"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = userAnswers[currentQuestionIndex] === optionIndex
                    const isCorrect = currentQuestion.correctAnswer === optionIndex
                    const isIncorrect = showResults && isSelected && !isCorrect
                    const isMissedCorrect = showResults && !isSelected && isCorrect
                    
                    let optionClass = "p-3 border rounded-lg transition-all duration-200 hover:bg-secondary/50 cursor-pointer"
                    
                    if (showResults) {
                      if (isCorrect) optionClass += " correct"
                      else if (isIncorrect) optionClass += " incorrect"
                      else if (isMissedCorrect) optionClass += " missed-correct"
                    } else if (isSelected) {
                      optionClass += " selected"
                    }
                    
                    return (
                      <motion.div 
                        key={optionIndex}
                        className={optionClass}
                        onClick={() => !showResults && handleAnswerSelect(currentQuestionIndex, optionIndex)}
                        whileHover={{ scale: !showResults ? 1.01 : 1 }}
                        whileTap={{ scale: !showResults ? 0.99 : 1 }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center mr-3">
                            {isSelected && <div className="w-3 h-3 rounded-full bg-current"></div>}
                          </div>
                          <div>{option}</div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                
                {showResults && showExplanations && (
                  <motion.div 
                    className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="font-semibold mb-2">Explication :</h3>
                    <p>{currentQuestion.explanation}</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="action-buttons flex flex-col md:flex-row justify-center gap-4 my-8">
          <motion.button 
            className="btn btn-primary"
            onClick={handleCheckAnswers}
            disabled={userAnswers.every(a => a === null) || showResults}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-5 h-5" />
            Vérifier les réponses
          </motion.button>
          <motion.button 
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={userAnswers.every(a => a === null) && !showResults}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw className="w-5 h-5" />
            Réinitialiser
          </motion.button>
          {showResults && (
            <motion.button 
              className="btn btn-secondary"
              onClick={handleExportResults}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="w-5 h-5" />
              Exporter les résultats
            </motion.button>
          )}
        </div>

        {showResults && (
          <motion.div 
            className="p-6 rounded-xl text-center mb-8 bg-card border border-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4">Résultats</h2>
            
            <div className="stats flex flex-wrap justify-center gap-6 mb-6">
              <div className="stat p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Score</div>
                <div className="text-3xl font-bold text-primary">
                  {score}%
                </div>
              </div>
              
              <div className="stat p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Correctes</div>
                <div className="text-3xl font-bold text-success">
                  {correctCount}
                </div>
              </div>
              
              <div className="stat p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Incorrectes</div>
                <div className="text-3xl font-bold text-destructive">
                  {incorrectCount}
                </div>
              </div>
              
              <div className="stat p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Sans réponse</div>
                <div className="text-3xl font-bold text-warning">
                  {skippedCount}
                </div>
              </div>
            </div>
            
            {isClient && (
              <div className="h-64 mb-6">
                <Suspense fallback={<div>Chargement du graphique...</div>}>
                  <ResultsChart 
                    correct={correctCount}
                    incorrect={incorrectCount}
                    skipped={skippedCount}
                  />
                </Suspense>
              </div>
            )}
            
            <p className="text-lg mb-4">
              {score >= 70 
                ? "Félicitations ! Vous avez réussi le quiz."
                : "Continuez à vous entraîner pour améliorer votre score."}
            </p>
          </motion.div>
        )}

        <footer className="text-center text-muted-foreground text-sm pt-6 border-t border-border">
          <p>QCM © 2025 | Tous droits réservés</p>
        </footer>
      </motion.div>
    </main>
  )
}
