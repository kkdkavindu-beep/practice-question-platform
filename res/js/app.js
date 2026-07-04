/**
 * Nexus - Practice Question Platform
 * Core Application Logic
 */

// --- State Management ---
const AppState = {
    allQuestions: [],
    filteredQuestions: [],
    currentQuiz: [],
    currentIndex: 0,
    userAnswers: [], // Array of objects { question, selectedOptions, isCorrect, timeSpent }
    score: 0,
    startTime: null,
    timerInterval: null,
    filters: {
        years: new Set(),
        competencies: new Set(),
        count: 10
    }
};

// --- DOM Elements ---
const DOM = {
    screens: document.querySelectorAll('.screen'),
    navHome: document.getElementById('nav-home'),
    navScoreboard: document.getElementById('nav-scoreboard'),
    
    // Filter Screen
    filterYears: document.getElementById('filter-years'),
    filterCompetencies: document.getElementById('filter-competencies'),
    filterCount: document.getElementById('filter-count'),
    filterCountDisplay: document.getElementById('filter-count-display'),
    matchingCount: document.getElementById('matching-count'),
    btnStartQuiz: document.getElementById('btn-start-quiz'),
    
    // Quiz Screen
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    quizQuestionNumber: document.getElementById('quiz-question-number'),
    quizTimeElapsed: document.getElementById('quiz-time-elapsed'),
    metaYear: document.getElementById('meta-year'),
    metaCompetency: document.getElementById('meta-competency'),
    quizQuestionText: document.getElementById('quiz-question-text'),
    quizOptions: document.getElementById('quiz-options'),
    btnPrevQuestion: document.getElementById('btn-prev-question'),
    btnSubmitAnswer: document.getElementById('btn-submit-answer'),
    btnNextQuestion: document.getElementById('btn-next-question'),
    quizFeedback: document.getElementById('quiz-feedback'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackDesc: document.getElementById('feedback-desc'),
    
    // Result Screen
    resultPercentage: document.getElementById('result-percentage'),
    resultCircle: document.getElementById('result-circle'),
    resultScore: document.getElementById('result-score'),
    resultCorrect: document.getElementById('result-correct'),
    resultIncorrect: document.getElementById('result-incorrect'),
    resultTime: document.getElementById('result-time'),
    btnReview: document.getElementById('btn-review'),
    btnRestart: document.getElementById('btn-restart'),
    
    // Review Screen
    btnBackResult: document.getElementById('btn-back-result'),
    reviewFilters: document.querySelectorAll('.review-filter-btn'),
    reviewSearch: document.getElementById('review-search'),
    reviewList: document.getElementById('review-list'),
    
    // Scoreboard Screen
    statBestScore: document.getElementById('stat-best-score'),
    statAvgScore: document.getElementById('stat-avg-score'),
    statTotalQuestions: document.getElementById('stat-total-questions'),
    statTotalTime: document.getElementById('stat-total-time'),
    sessionsList: document.getElementById('sessions-list'),
    
    toastContainer: document.getElementById('toast-container')
};

// --- Initialization & Data Fetching ---
async function initApp() {
    try {
        if (!window.QUIZ_DATA) throw new Error('Failed to load databanks. Data source missing.');
        
        AppState.allQuestions = window.QUIZ_DATA;
        
        if (AppState.allQuestions.length === 0) {
            throw new Error('Databanks are empty.');
        }

        populateFilters();
        updateMatchingCount();
        loadScoreboardData();
        switchScreen('screen-filter');
        
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Initialization failed. Please check data file.', 'error');
        document.querySelector('#screen-loading h2').innerText = 'System Failure';
        document.querySelector('#screen-loading p').innerText = error.message;
    }
}

// --- Navigation ---
function switchScreen(screenId) {
    DOM.screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Update nav active states
    DOM.navHome.classList.remove('active');
    DOM.navScoreboard.classList.remove('active');
    
    if (screenId === 'screen-filter' || screenId === 'screen-quiz' || screenId === 'screen-result' || screenId === 'screen-review') {
        DOM.navHome.classList.add('active');
    } else if (screenId === 'screen-scoreboard') {
        DOM.navScoreboard.classList.add('active');
    }
}

DOM.navHome.addEventListener('click', () => {
    // If mid-quiz, maybe confirm? For now just go to home
    if (document.getElementById('screen-quiz').classList.contains('active')) {
        if(confirm("Abandon current simulation?")) {
            stopTimer();
            switchScreen('screen-filter');
        }
    } else {
        switchScreen('screen-filter');
    }
});

DOM.navScoreboard.addEventListener('click', () => {
    if (document.getElementById('screen-quiz').classList.contains('active')) {
        if(confirm("Abandon current simulation?")) {
            stopTimer();
            loadScoreboardData();
            switchScreen('screen-scoreboard');
        }
    } else {
        loadScoreboardData();
        switchScreen('screen-scoreboard');
    }
});

// --- Filter Logic ---
function populateFilters() {
    const years = new Set();
    const competencies = new Set();
    
    AppState.allQuestions.forEach(q => {
        if (q.metadata.year) years.add(q.metadata.year);
        if (q.metadata.competency_levels) {
            q.metadata.competency_levels.forEach(c => competencies.add(c));
        }
    });

    // Populate Years
    Array.from(years).sort().forEach(year => {
        DOM.filterYears.appendChild(createCheckboxItem(year, 'year', year));
        AppState.filters.years.add(year); // Default all selected
    });

    // Populate Competencies
    Array.from(competencies).sort().forEach(comp => {
        DOM.filterCompetencies.appendChild(createCheckboxItem(comp, 'competency', comp));
        AppState.filters.competencies.add(comp); // Default all selected
    });

    DOM.filterCount.max = AppState.allQuestions.length;
    DOM.filterCount.value = Math.min(10, AppState.allQuestions.length);
    AppState.filters.count = parseInt(DOM.filterCount.value);
    DOM.filterCountDisplay.innerText = AppState.filters.count;
}

function createCheckboxItem(label, type, value) {
    const labelEl = document.createElement('label');
    labelEl.className = 'checkbox-item';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = true;
    input.dataset.type = type;
    
    input.addEventListener('change', handleFilterChange);
    
    const span = document.createElement('span');
    span.className = 'checkmark';
    span.innerText = label;
    
    labelEl.appendChild(input);
    labelEl.appendChild(span);
    
    return labelEl;
}

function handleFilterChange(e) {
    const type = e.target.dataset.type;
    const value = e.target.value;
    
    if (e.target.checked) {
        if (type === 'year') AppState.filters.years.add(value);
        if (type === 'competency') AppState.filters.competencies.add(value);
    } else {
        if (type === 'year') AppState.filters.years.delete(value);
        if (type === 'competency') AppState.filters.competencies.delete(value);
    }
    
    updateMatchingCount();
}

DOM.filterCount.addEventListener('input', (e) => {
    AppState.filters.count = parseInt(e.target.value);
    DOM.filterCountDisplay.innerText = AppState.filters.count;
});

function updateMatchingCount() {
    AppState.filteredQuestions = AppState.allQuestions.filter(q => {
        const matchesYear = AppState.filters.years.has(q.metadata.year);
        const matchesComp = q.metadata.competency_levels.some(c => AppState.filters.competencies.has(c));
        return matchesYear && matchesComp;
    });

    DOM.matchingCount.innerText = AppState.filteredQuestions.length;
    
    if (AppState.filteredQuestions.length === 0) {
        DOM.btnStartQuiz.disabled = true;
    } else {
        DOM.btnStartQuiz.disabled = false;
        // Adjust max count slider based on matching
        const maxAvailable = AppState.filteredQuestions.length;
        DOM.filterCount.max = maxAvailable;
        if (AppState.filters.count > maxAvailable) {
            AppState.filters.count = maxAvailable;
            DOM.filterCount.value = maxAvailable;
            DOM.filterCountDisplay.innerText = maxAvailable;
        }
    }
}

// --- Quiz Logic ---
DOM.btnStartQuiz.addEventListener('click', startQuiz);

function startQuiz() {
    if (AppState.filteredQuestions.length === 0) {
        showToast('No questions match current filters.', 'error');
        return;
    }

    // Shuffle and slice
    const shuffled = [...AppState.filteredQuestions].sort(() => 0.5 - Math.random());
    AppState.currentQuiz = shuffled.slice(0, AppState.filters.count);
    
    // Reset state
    AppState.currentIndex = 0;
    AppState.score = 0;
    AppState.userAnswers = new Array(AppState.currentQuiz.length).fill(null);
    
    startTimer();
    switchScreen('screen-quiz');
    renderQuestion();
}

function getCorrectAnswers(ansObject) {
    let maxScore = -Infinity;
    const correctKeys = [];
    
    for (const key in ansObject) {
        const score = ansObject[key];
        if (score > maxScore) {
            maxScore = score;
            correctKeys.length = 0; // Clear array
            correctKeys.push(key);
        } else if (score === maxScore) {
            correctKeys.push(key);
        }
    }
    return correctKeys;
}

function renderQuestion() {
    const qIndex = AppState.currentIndex;
    const question = AppState.currentQuiz[qIndex];
    
    // Header updates
    DOM.quizQuestionNumber.innerText = `Question ${qIndex + 1} of ${AppState.currentQuiz.length}`;
    DOM.quizProgressFill.style.width = `${((qIndex) / AppState.currentQuiz.length) * 100}%`;
    DOM.metaYear.innerText = question.metadata.year || 'N/A';
    DOM.metaCompetency.innerText = (question.metadata.competency_levels || []).join(', ');
    
    // Content updates
    DOM.quizQuestionText.innerText = question.quz;
    DOM.quizOptions.innerHTML = '';
    
    // Controls
    DOM.btnPrevQuestion.style.visibility = qIndex > 0 ? 'visible' : 'hidden';
    DOM.quizFeedback.classList.add('hidden');
    DOM.btnSubmitAnswer.classList.remove('hidden');
    DOM.btnNextQuestion.classList.add('hidden');
    
    // Shuffle options
    const optionKeys = Object.keys(question.ans).sort(() => 0.5 - Math.random());
    
    const existingAnswer = AppState.userAnswers[qIndex];
    const isAlreadyAnswered = existingAnswer !== null;

    optionKeys.forEach(key => {
        const optionCard = document.createElement('div');
        optionCard.className = 'option-card';
        optionCard.dataset.key = key;
        
        const indicator = document.createElement('div');
        indicator.className = 'option-indicator';
        indicator.innerHTML = '<i class="fa-solid fa-check"></i>';
        
        const text = document.createElement('span');
        text.innerText = key;
        
        optionCard.appendChild(indicator);
        optionCard.appendChild(text);
        
        if (isAlreadyAnswered) {
            // Re-render past state
            if (existingAnswer.selectedOptions.includes(key)) {
                optionCard.classList.add('selected');
            }
            
            // Show correct/wrong
            const correctKeys = getCorrectAnswers(question.ans);
            if (correctKeys.includes(key)) {
                optionCard.classList.add('correct-answer');
            } else if (existingAnswer.selectedOptions.includes(key)) {
                optionCard.classList.add('wrong-answer');
            }
            optionCard.style.cursor = 'default';
        } else {
            // Interactive mode
            optionCard.addEventListener('click', () => {
                optionCard.classList.toggle('selected');
            });
        }
        
        DOM.quizOptions.appendChild(optionCard);
    });

    if (isAlreadyAnswered) {
        DOM.btnSubmitAnswer.classList.add('hidden');
        DOM.btnNextQuestion.classList.remove('hidden');
        if(qIndex === AppState.currentQuiz.length - 1) {
            DOM.btnNextQuestion.innerHTML = 'View Results <i class="fa-solid fa-flag-checkered"></i>';
        } else {
            DOM.btnNextQuestion.innerHTML = 'Next <i class="fa-solid fa-chevron-right"></i>';
        }
        
        showFeedback(existingAnswer.isCorrect);
    } else {
        DOM.btnSubmitAnswer.disabled = false;
    }
}

DOM.btnSubmitAnswer.addEventListener('click', () => {
    const selectedCards = document.querySelectorAll('.option-card.selected');
    if (selectedCards.length === 0) {
        showToast('Please select at least one answer.', 'warning');
        return;
    }

    const selectedKeys = Array.from(selectedCards).map(card => card.dataset.key);
    const question = AppState.currentQuiz[AppState.currentIndex];
    const correctKeys = getCorrectAnswers(question.ans);
    
    // Check correctness
    let status = 'incorrect';
    let correctCount = 0;
    
    selectedKeys.forEach(k => {
        if (correctKeys.includes(k)) correctCount++;
    });
    
    // Exact match = correct
    if (selectedKeys.length === correctKeys.length && correctCount === correctKeys.length) {
        status = 'correct';
        AppState.score++;
    } 
    // Selected some correct, but missed some or added wrong ones
    else if (correctCount > 0 && selectedKeys.length <= correctKeys.length) {
        // Technically, partially correct could mean they selected at least one correct without selecting wrong.
        // Or they selected some correct, some wrong.
        // Let's define partially correct as: at least one correct option selected, and NO wrong options selected.
        const wrongSelected = selectedKeys.filter(k => !correctKeys.includes(k)).length;
        if (wrongSelected === 0) {
            status = 'partial';
            AppState.score += (correctCount / correctKeys.length); // Fractional score
        } else {
            status = 'incorrect';
        }
    }

    // Save state
    AppState.userAnswers[AppState.currentIndex] = {
        question: question,
        selectedOptions: selectedKeys,
        status: status,
        isCorrect: status === 'correct' // Boolean for backwards compat where used
    };

    // UI Updates
    document.querySelectorAll('.option-card').forEach(card => {
        card.style.cursor = 'default';
        // Remove click listener by cloning
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        const key = newCard.dataset.key;
        if (correctKeys.includes(key)) {
            newCard.classList.add('correct-answer');
        } else if (selectedKeys.includes(key)) {
            newCard.classList.add('wrong-answer');
        }
    });

    DOM.btnSubmitAnswer.classList.add('hidden');
    DOM.btnNextQuestion.classList.remove('hidden');
    
    if(AppState.currentIndex === AppState.currentQuiz.length - 1) {
        DOM.btnNextQuestion.innerHTML = 'View Results <i class="fa-solid fa-flag-checkered"></i>';
    } else {
        DOM.btnNextQuestion.innerHTML = 'Next <i class="fa-solid fa-chevron-right"></i>';
    }

    showFeedback(status);
});

DOM.btnNextQuestion.addEventListener('click', () => {
    if (AppState.currentIndex < AppState.currentQuiz.length - 1) {
        AppState.currentIndex++;
        renderQuestion();
    } else {
        finishQuiz();
    }
});

DOM.btnPrevQuestion.addEventListener('click', () => {
    if (AppState.currentIndex > 0) {
        AppState.currentIndex--;
        renderQuestion();
    }
});

function showFeedback(status) {
    DOM.quizFeedback.classList.remove('hidden', 'correct', 'incorrect', 'partial');
    if (status === 'correct') {
        DOM.quizFeedback.classList.add('correct');
        DOM.feedbackTitle.innerText = 'Correct!';
        DOM.feedbackDesc.innerText = 'Optimal response recorded.';
    } else if (status === 'partial') {
        DOM.quizFeedback.classList.add('warning'); // We can use warning styling
        DOM.quizFeedback.style.borderLeftColor = 'var(--warning)';
        DOM.feedbackTitle.innerText = 'Partially Correct';
        DOM.feedbackDesc.innerText = 'You found some, but not all optimal responses.';
        DOM.quizFeedback.querySelector('.feedback-icon').style.color = 'var(--warning)';
    } else {
        DOM.quizFeedback.classList.add('incorrect');
        DOM.feedbackTitle.innerText = 'Incorrect';
        DOM.feedbackDesc.innerText = 'Sub-optimal response.';
    }
}

// --- Timer Logic ---
function startTimer() {
    AppState.startTime = Date.now();
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - AppState.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        DOM.quizTimeElapsed.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(AppState.timerInterval);
    return Math.floor((Date.now() - AppState.startTime) / 1000);
}

// --- Results & Scoreboard Logic ---
function finishQuiz() {
    const timeSpent = stopTimer();
    const total = AppState.currentQuiz.length;
    const correct = AppState.userAnswers.filter(a => a && a.isCorrect).length;
    const incorrect = total - correct;
    const percentage = Math.round((correct / total) * 100);
    
    // Save session
    const sessionData = {
        date: new Date().toISOString(),
        score: correct,
        total: total,
        percentage: percentage,
        time: timeSpent
    };
    saveSession(sessionData);

    // Update UI
    DOM.resultPercentage.innerText = `${percentage}%`;
    DOM.resultScore.innerText = `${correct} / ${total}`;
    DOM.resultCorrect.innerText = correct;
    DOM.resultIncorrect.innerText = incorrect;
    
    const mins = Math.floor(timeSpent / 60);
    const secs = timeSpent % 60;
    DOM.resultTime.innerText = `${mins}m ${secs}s`;
    
    // Animate Circle
    setTimeout(() => {
        const offset = 283 - (283 * percentage) / 100;
        DOM.resultCircle.style.strokeDashoffset = offset;
        
        // Color based on performance
        if (percentage >= 80) DOM.resultCircle.style.stroke = 'var(--success)';
        else if (percentage >= 50) DOM.resultCircle.style.stroke = 'var(--warning)';
        else DOM.resultCircle.style.stroke = 'var(--error)';
    }, 100);

    switchScreen('screen-result');
}

DOM.btnRestart.addEventListener('click', () => {
    switchScreen('screen-filter');
});

DOM.btnReview.addEventListener('click', () => {
    renderReviewList('all');
    switchScreen('screen-review');
});

DOM.btnBackResult.addEventListener('click', () => {
    switchScreen('screen-result');
});

// --- Review Screen Logic ---
DOM.reviewFilters.forEach(btn => {
    btn.addEventListener('click', (e) => {
        DOM.reviewFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderReviewList(e.target.dataset.filter);
    });
});

DOM.reviewSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const activeFilter = document.querySelector('.review-filter-btn.active').dataset.filter;
    renderReviewList(activeFilter, term);
});

function renderReviewList(filter = 'all', searchTerm = '') {
    DOM.reviewList.innerHTML = '';
    
    let list = AppState.userAnswers.filter(a => a !== null);
    
    if (filter === 'incorrect') {
        list = list.filter(a => !a.isCorrect);
    }
    
    if (searchTerm) {
        list = list.filter(a => a.question.quz.toLowerCase().includes(searchTerm));
    }
    
    if (list.length === 0) {
        DOM.reviewList.innerHTML = '<div class="empty-state">No questions found matching criteria.</div>';
        return;
    }
    
    list.forEach((item, idx) => {
        const correctKeys = getCorrectAnswers(item.question.ans);
        
        const card = document.createElement('div');
        card.className = `review-card ${item.isCorrect ? 'correct' : 'incorrect'}`;
        
        let html = `<div class="review-question">${idx + 1}. ${item.question.quz}</div>
                    <div class="review-options">`;
        
        for (const [optKey, optScore] of Object.entries(item.question.ans)) {
            const isCorrectOption = correctKeys.includes(optKey);
            const isUserSelected = item.selectedOptions.includes(optKey);
            
            let optClass = 'review-option';
            if (isCorrectOption) optClass += ' correct';
            if (isUserSelected && !isCorrectOption) optClass += ' user-wrong';
            
            html += `<div class="${optClass}">${optKey}</div>`;
        }
        
        html += `</div>`;
        card.innerHTML = html;
        DOM.reviewList.appendChild(card);
    });
}

// --- Scoreboard / LocalStorage ---
function saveSession(session) {
    let sessions = JSON.parse(localStorage.getItem('nexus_sessions')) || [];
    sessions.push(session);
    localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
}

function loadScoreboardData() {
    const sessions = JSON.parse(localStorage.getItem('nexus_sessions')) || [];
    
    if (sessions.length === 0) {
        return; // Empty state handles it
    }
    
    let bestAcc = 0;
    let totalPerc = 0;
    let totalQuestions = 0;
    let totalTime = 0;
    
    sessions.forEach(s => {
        if (s.percentage > bestAcc) bestAcc = s.percentage;
        totalPerc += s.percentage;
        totalQuestions += s.total;
        totalTime += s.time;
    });
    
    const avgAcc = Math.round(totalPerc / sessions.length);
    const timeMins = Math.round(totalTime / 60);
    
    DOM.statBestScore.innerText = `${bestAcc}%`;
    DOM.statAvgScore.innerText = `${avgAcc}%`;
    DOM.statTotalQuestions.innerText = totalQuestions;
    DOM.statTotalTime.innerText = `${timeMins}m`;
    
    // Render list (newest first)
    DOM.sessionsList.innerHTML = '';
    [...sessions].reverse().slice(0, 10).forEach(s => {
        const dateObj = new Date(s.date);
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
            <div class="session-info">
                <div class="session-date">${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">Time: ${Math.floor(s.time/60)}m ${s.time%60}s</div>
            </div>
            <div class="session-score neon-text">${s.score}/${s.total} (${s.percentage}%)</div>
        `;
        DOM.sessionsList.appendChild(item);
    });
}

// --- Utilities ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'error' ? 'fa-triangle-exclamation' : 
                 type === 'success' ? 'fa-check-circle' : 
                 type === 'warning' ? 'fa-circle-exclamation' : 'fa-info-circle';
                 
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Start App
document.addEventListener('DOMContentLoaded', initApp);
