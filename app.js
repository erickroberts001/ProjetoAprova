// Dados iniciais
const INITIAL_SUBJECTS = [
    { id: 's1', name: 'Direito Constitucional', weight: 3 },
    { id: 's2', name: 'Contabilidade Geral', weight: 2 },
    { id: 's3', name: 'Língua Portuguesa', weight: 1 },
    { id: 's4', name: 'Direito Administrativo', weight: 2 },
];

const INITIAL_TOPICS = [
    { id: 't1', subjectId: 's1', title: 'Direitos Fundamentais', t: true, r: 1, q: false, lastInteraction: '2023-10-20' },
    { id: 't2', subjectId: 's1', title: 'Organização do Estado', t: false, r: 0, q: false, lastInteraction: null },
    { id: 't4', subjectId: 's2', title: 'Balanço Patrimonial', t: false, r: 0, q: false, lastInteraction: null },
];

// Componente Icon
function Icon({ name, size = 18, className, onClick }) {
    useEffect(() => {
        if (window.lucide) {
            lucide.createIcons();
        }
    }, [name]);
    
    return React.createElement('i', {
        'data-lucide': name,
        width: size,
        height: size,
        className: className,
        strokeWidth: "1.5",
        onClick: onClick
    });
}

// Funções utilitárias
function calculateDaysLeft(dateStr) {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatTime(seconds) {
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    return `${seconds < 0 ? '+' : ''}${m}:${s}`;
}

// Componente Modal
function Modal({ isOpen, title, children, onClose }) {
    if (!isOpen) return null;
    
    return React.createElement('div', {
        className: "modal-overlay fade-in"
    },
        React.createElement('div', {
            className: "bg-[#FDFBF7] border-line p-8 rounded shadow-xl w-full max-w-md relative"
        },
            React.createElement('button', {
                onClick: onClose,
                className: "absolute top-4 right-4 text-gray-400 hover:text-black"
            }, React.createElement(Icon, { name: "x", size: 18 })),
            React.createElement('h3', {
                className: "font-serif font-bold text-xl mb-4 text-[#2D2D2D]"
            }, title),
            children
        )
    );
}

// Componente TimeSelector
function TimeSelector({ onSelect }) {
    return React.createElement('div', {
        className: "flex-col-center h-full fade-in"
    },
        React.createElement('h3', {
            className: "text-xl font-serif mb-8 text-gray-500 italic"
        }, "Tempo disponível para esta sessão:"),
        React.createElement('div', { className: "flex gap-6" },
            [25, 35, 50].map(min => 
                React.createElement('button', {
                    key: min,
                    onClick: () => onSelect(min),
                    className: "w-24 h-24 rounded-full border-line hover:border-[#2D2D2D] hover:bg-[#E3D5CA] transition-all flex-col-center group"
                },
                    React.createElement('span', {
                        className: "text-2xl font-mono font-bold text-[#2D2D2D]"
                    }, min),
                    React.createElement('span', {
                        className: "text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-[#2D2D2D]"
                    }, "Min")
                )
            )
        )
    );
}

// Componente Pomodoro
function Pomodoro({ subject, onFinish, onCancel }) {
    const [mode, setMode] = React.useState('setup');
    const [plannedMinutes, setPlannedMinutes] = React.useState(0);
    const [startTime, setStartTime] = React.useState(null);
    const [elapsed, setElapsed] = React.useState(0);
    const [isRunning, setIsRunning] = React.useState(false);
    const [comprehension, setComprehension] = React.useState(null);
    const [questionsCount, setQuestionsCount] = React.useState('');
    const [notes, setNotes] = React.useState('');

    React.useEffect(() => {
        const savedState = localStorage.getItem('timer_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.subjectId === subject.id && (Date.now() - state.timestamp < 43200000)) {
                setPlannedMinutes(state.plannedMinutes);
                setStartTime(state.startTime);
                if (state.isRunning) {
                    const now = Date.now();
                    const diffSeconds = Math.floor((now - state.lastSave) / 1000);
                    setElapsed(state.elapsed + diffSeconds);
                } else {
                    setElapsed(state.elapsed);
                }
                setIsRunning(state.isRunning);
                setMode('running');
            }
        }
    }, [subject.id]);

    React.useEffect(() => {
        let interval = null;
        if (isRunning && mode === 'running') {
            interval = setInterval(() => {
                setElapsed(prev => {
                    const newElapsed = prev + 1;
                    localStorage.setItem('timer_state', JSON.stringify({
                        subjectId: subject.id,
                        plannedMinutes,
                        startTime: startTime || Date.now(),
                        elapsed: newElapsed,
                        isRunning: true,
                        lastSave: Date.now(),
                        timestamp: Date.now()
                    }));
                    return newElapsed;
                });
            }, 1000);
        } else if (mode === 'running') {
            localStorage.setItem('timer_state', JSON.stringify({
                subjectId: subject.id,
                plannedMinutes,
                startTime,
                elapsed,
                isRunning: false,
                lastSave: Date.now(),
                timestamp: Date.now()
            }));
        }
        return () => clearInterval(interval);
    }, [isRunning, mode, plannedMinutes, startTime, subject.id, elapsed]);

    const handleStart = (mins) => {
        setPlannedMinutes(mins);
        setStartTime(Date.now());
        setElapsed(0);
        setIsRunning(true);
        setMode('running');
    };

    const handleEndSession = () => {
        setIsRunning(false);
        setMode('feedback');
        localStorage.removeItem('timer_state');
    };

    const submitSession = () => {
        const plannedSec = plannedMinutes * 60;
        const overtime = Math.max(0, elapsed - plannedSec);
        const actualExecuted = Math.min(elapsed, plannedSec);
        
        onFinish({
            subjectId: subject.id,
            plannedSeconds: plannedSec,
            executedSeconds: actualExecuted,
            overtimeSeconds: overtime,
            questions: parseInt(questionsCount) || 0,
            comprehension,
            notes
        });
    };

    if (mode === 'setup') {
        return React.createElement(TimeSelector, { onSelect: handleStart });
    }

    if (mode === 'feedback') {
        return React.createElement('div', {
            className: "h-full flex-col-center fade-in max-w-md mx-auto"
        },
            React.createElement('h2', {
                className: "text-2xl font-serif mb-6"
            }, "Registro da Sessão"),
            React.createElement('div', { className: "w-full space-y-6" },
                React.createElement('div', null,
                    React.createElement('label', {
                        className: "block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3"
                    }, "Nível de Compreensão"),
                    React.createElement('div', { className: "flex justify-between gap-4" },
                        ['Baixa', 'Média', 'Alta'].map(level =>
                            React.createElement('button', {
                                key: level,
                                onClick: () => setComprehension(level),
                                className: `flex-1 py-3 border-line text-sm font-mono transition-all ${comprehension === level ? 'bg-[#2D2D2D] text-white' : 'hover:border-[#2D2D2D]'}`
                            }, level)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', {
                        className: "block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2"
                    }, "Questões Realizadas"),
                    React.createElement('input', {
                        type: "number",
                        className: "w-full bg-transparent border-b-line p-2 font-mono text-lg focus:border-[#2D2D2D]",
                        placeholder: "0",
                        value: questionsCount,
                        onChange: e => setQuestionsCount(e.target.value)
                    })
                ),
                React.createElement('div', null,
                    React.createElement('label', {
                        className: "block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2"
                    }, "Notas Rápidas (Salvas no Histórico)"),
                    React.createElement('textarea', {
                        className: "w-full bg-transparent border-line p-3 font-serif text-sm h-24 resize-none focus:border-[#2D2D2D]",
                        placeholder: "O que fixar? O que revisar?",
                        value: notes,
                        onChange: e => setNotes(e.target.value)
                    })
                ),
                React.createElement('button', {
                    onClick: submitSession,
                    disabled: !comprehension,
                    className: "w-full bg-[#2D2D2D] text-[#FDFBF7] py-4 font-mono uppercase tracking-widest text-sm hover:bg-black disabled:opacity-50 transition-colors"
                }, "Salvar & Continuar")
            )
        );
    }

    const plannedSeconds = plannedMinutes * 60;
    const isOvertime = elapsed > plannedSeconds;
    const displayTime = isOvertime ? elapsed - plannedSeconds : plannedSeconds - elapsed;

    return React.createElement('div', {
        className: "h-full flex-col-center fade-in relative"
    },
        React.createElement('button', {
            onClick: onCancel,
            className: "absolute top-0 left-0 text-xs font-mono text-gray-400 hover:text-[#2D2D2D] flex items-center gap-2"
        },
            React.createElement(Icon, { name: "arrow-left", size: 14 }),
            " VOLTAR"
        ),
        React.createElement('div', { className: "text-center mb-8" },
            React.createElement('span', {
                className: "text-xs font-mono text-gray-400 uppercase tracking-widest block mb-2"
            }, "Focando em"),
            React.createElement('h2', {
                className: "text-3xl font-bold font-serif max-w-lg leading-tight"
            }, subject.name)
        ),
        React.createElement('div', {
            className: `text-[100px] md:text-[140px] leading-none font-mono font-light tracking-tighter tabular-nums mb-4 ${isOvertime ? 'text-[#A63D40]' : 'text-[#2D2D2D]'}`
        }, formatTime(displayTime)),
        isOvertime && React.createElement('div', { className: "text-center mb-8" },
            React.createElement('span', {
                className: "text-[#A63D40] font-mono text-xs uppercase tracking-widest animate-pulse block"
            }, "Tempo Extra (Overrun)"),
            React.createElement('span', {
                className: "text-gray-400 font-mono text-[10px]"
            }, "Contando separadamente do planejado")
        ),
        React.createElement('div', { className: "flex gap-4 mt-8" },
            React.createElement('button', {
                onClick: () => setIsRunning(!isRunning),
                className: "w-32 py-3 border-line font-mono text-sm uppercase tracking-widest hover:border-[#2D2D2D] transition-colors"
            }, isRunning ? 'Pausar' : 'Retomar'),
            React.createElement('button', {
                onClick: handleEndSession,
                className: "w-32 py-3 bg-[#2D2D2D] text-[#FDFBF7] font-mono text-sm uppercase tracking-widest hover:bg-black transition-colors"
            }, "Encerrar")
        )
    );
}

// Componente DataAnalytics
function DataAnalytics({ sessions, subjects }) {
    const stats = React.useMemo(() => {
        const totalSeconds = sessions.reduce((acc, s) => acc + s.executedSeconds, 0);
        const plannedSeconds = sessions.reduce((acc, s) => acc + s.plannedSeconds, 0);
        const overtimeSeconds = sessions.reduce((acc, s) => acc + (s.overtimeSeconds || 0), 0);
        const totalQuestions = sessions.reduce((acc, s) => acc + (s.questions || 0), 0);
        
        const bySubject = subjects.map(sub => {
            const subSessions = sessions.filter(s => s.subjectId === sub.id);
            const time = subSessions.reduce((acc, s) => acc + s.executedSeconds, 0);
            return { name: sub.name, time, timeH: (time/3600).toFixed(1) };
        }).filter(s => s.time > 0).sort((a,b) => b.time - a.time);

        const sessionNotes = sessions.filter(s => s.notes && s.notes.trim() !== "").sort((a,b) => b.id - a.id);

        return { totalSeconds, plannedSeconds, overtimeSeconds, bySubject, totalQuestions, sessionNotes };
    }, [sessions, subjects]);

    const formatH = (s) => (s / 3600).toFixed(1) + 'h';
    const maxTime = stats.bySubject.length > 0 ? stats.bySubject[0].time : 1;

    return React.createElement('div', {
        className: "fade-in max-w-4xl mx-auto pb-12"
    },
        React.createElement('header', {
            className: "mb-12 pt-4 flex justify-between items-end"
        },
            React.createElement('h1', {
                className: "text-3xl font-serif font-bold"
            }, "Relatório de Dados")
        ),
        React.createElement('div', {
            className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        },
            React.createElement('div', { className: "border-line p-4 bg-white/50" },
                React.createElement('span', {
                    className: "text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-1"
                }, "Total"),
                React.createElement('span', {
                    className: "text-2xl font-serif text-[#2D2D2D]"
                }, formatH(stats.totalSeconds))
            ),
            React.createElement('div', { className: "border-line p-4 bg-white/50" },
                React.createElement('span', {
                    className: "text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-1"
                }, "Questões"),
                React.createElement('span', {
                    className: "text-2xl font-serif text-[#2D2D2D]"
                }, stats.totalQuestions)
            ),
            React.createElement('div', { className: "border-line p-4 bg-white/50" },
                React.createElement('span', {
                    className: "text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-1"
                }, "Planejado"),
                React.createElement('span', {
                    className: "text-2xl font-serif text-gray-600"
                }, formatH(stats.plannedSeconds))
            ),
            React.createElement('div', { className: "border-line p-4 bg-white/50" },
                React.createElement('span', {
                    className: "text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-1"
                }, "Extra"),
                React.createElement('span', {
                    className: "text-2xl font-serif text-[#A63D40]"
                }, formatH(stats.overtimeSeconds))
            )
        ),
        React.createElement('div', {
            className: "grid grid-cols-1 md:grid-cols-2 gap-12"
        },
            React.createElement('div', null,
                React.createElement('h3', {
                    className: "text-sm font-mono text-gray-400 uppercase tracking-widest mb-6"
                }, "Distribuição por Disciplina"),
                React.createElement('div', { className: "space-y-4 mb-8" },
                    stats.bySubject.length === 0 ?
                        React.createElement('div', {
                            className: "text-center p-8 border-line border-dashed text-gray-400 text-sm font-serif italic"
                        }, "Nenhum dado registrado.") :
                        stats.bySubject.map((item, index) =>
                            React.createElement('div', {
                                key: index,
                                className: "flex flex-col gap-1"
                            },
                                React.createElement('div', {
                                    className: "flex justify-between items-end mb-1"
                                },
                                    React.createElement('span', {
                                        className: "text-sm font-serif text-[#2D2D2D]"
                                    }, item.name),
                                    React.createElement('span', {
                                        className: "text-xs font-mono text-gray-500"
                                    }, formatH(item.time))
                                ),
                                React.createElement('div', {
                                    className: "w-full bg-[#E0E0E0] h-2 rounded-sm overflow-hidden"
                                },
                                    React.createElement('div', {
                                        className: "bg-[#2D2D2D] h-full rounded-sm transition-all duration-500",
                                        style: { width: `${(item.time / maxTime) * 100}%` }
                                    })
                                )
                            )
                        )
                )
            ),
            React.createElement('div', null,
                React.createElement('h3', {
                    className: "text-sm font-mono text-gray-400 uppercase tracking-widest mb-6"
                }, "Caderno de Notas"),
                React.createElement('div', {
                    className: "space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar"
                },
                    stats.sessionNotes.length === 0 ?
                        React.createElement('div', {
                            className: "text-center p-8 border-line border-dashed text-gray-400 text-sm font-serif italic"
                        }, "Nenhuma nota registrada.") :
                        stats.sessionNotes.map((note) => {
                            const subjectName = subjects.find(s => s.id === note.subjectId)?.name || 'Disciplina Desconhecida';
                            return React.createElement('div', {
                                key: note.id,
                                className: "border-b-line pb-4 mb-4 last:border-0 last:mb-0"
                            },
                                React.createElement('div', {
                                    className: "flex justify-between items-baseline mb-2"
                                },
                                    React.createElement('span', {
                                        className: "text-xs font-mono text-gray-500"
                                    }, new Date(note.date).toLocaleDateString()),
                                    React.createElement('span', {
                                        className: "text-[10px] font-mono text-[#2D2D2D] bg-[#E3D5CA] px-2 py-0.5 rounded uppercase"
                                    }, note.comprehension)
                                ),
                                React.createElement('p', {
                                    className: "text-xs font-bold font-serif text-[#2D2D2D] mb-1"
                                }, subjectName),
                                React.createElement('p', {
                                    className: "text-sm font-serif text-gray-600 italic leading-relaxed"
                                }, `"${note.notes}"`)
                            );
                        })
                )
            )
        )
    );
}

// Componente Syllabus
function Syllabus({ subjects, topics, onAddSubject, onAddTopic, onUpdateSubject, onUpdateTopic, onDeleteSubject, onDeleteTopic, onToggleTopic }) {
    const [editingId, setEditingId] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const [newSubName, setNewSubName] = React.useState('');
    const [newTopicName, setNewTopicName] = React.useState('');
    const [addingTopicTo, setAddingTopicTo] = React.useState(null);

    const startEdit = (id, currentVal) => {
        setEditingId(id);
        setEditValue(currentVal);
    };

    const saveEdit = (type, obj) => {
        if (type === 'subject') onUpdateSubject(obj.id, editValue);
        else onUpdateTopic(obj.id, editValue);
        setEditingId(null);
    };

    const handleAddSubject = () => {
        if (newSubName.trim()) {
            onAddSubject(newSubName);
            setNewSubName('');
        }
    };

    const handleAddTopic = (subjectId) => {
        if (newTopicName.trim()) {
            onAddTopic(subjectId, newTopicName);
            setNewTopicName('');
            setAddingTopicTo(null);
        }
    };

    return React.createElement('div', {
        className: "fade-in max-w-4xl mx-auto pb-12"
    },
        React.createElement('header', {
            className: "mb-12 pt-4 flex justify-between items-end"
        },
            React.createElement('div', null,
                React.createElement('h1', {
                    className: "text-3xl font-serif font-bold mb-2"
                }, "Edital Verticalizado"),
                React.createElement('p', {
                    className: "text-sm font-mono text-gray-500"
                }, "Gestão de Conteúdo e Revisões")
            )
        ),
        React.createElement('div', {
            className: "mb-8 flex gap-4"
        },
            React.createElement('input', {
                className: "bg-transparent border-b-line p-2 flex-1 font-serif",
                placeholder: "Nova Disciplina...",
                value: newSubName,
                onChange: e => setNewSubName(e.target.value)
            }),
            React.createElement('button', {
                onClick: handleAddSubject,
                className: "text-xs font-mono uppercase border-line px-4 hover:bg-[#2D2D2D] hover:text-white transition-colors"
            }, "Adicionar")
        ),
        React.createElement('div', { className: "space-y-12" },
            subjects.map(sub => {
                const subTopics = topics.filter(t => t.subjectId === sub.id);
                return React.createElement('div', { key: sub.id },
                    React.createElement('div', {
                        className: "flex items-center justify-between border-b-line pb-2 mb-6 group"
                    },
                        React.createElement('div', {
                            className: "flex items-center gap-2 flex-1"
                        },
                            editingId === sub.id ?
                                React.createElement('input', {
                                    className: "edit-input text-xl font-serif font-bold",
                                    autoFocus: true,
                                    value: editValue,
                                    onChange: e => setEditValue(e.target.value),
                                    onBlur: () => saveEdit('subject', sub),
                                    onKeyDown: e => e.key === 'Enter' && saveEdit('subject', sub)
                                }) :
                                React.createElement(React.Fragment, null,
                                    React.createElement('h2', {
                                        className: "text-xl font-serif font-bold"
                                    }, sub.name),
                                    React.createElement('button', {
                                        onClick: () => startEdit(sub.id, sub.name),
                                        className: "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black"
                                    }, React.createElement(Icon, { name: "pencil", size: 14 }))
                                )
                        ),
                        React.createElement('button', {
                            onClick: () => onDeleteSubject(sub.id),
                            className: "opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500"
                        }, React.createElement(Icon, { name: "trash-2", size: 14 }))
                    ),
                    React.createElement('div', {
                        className: "space-y-3 pl-4 border-l border-lines"
                    },
                        subTopics.map(topic =>
                            React.createElement('div', {
                                key: topic.id,
                                className: "flex items-center justify-between py-2 group"
                            },
                                React.createElement('div', {
                                    className: "flex-1 pr-4 flex items-center gap-2"
                                },
                                    editingId === topic.id ?
                                        React.createElement('input', {
                                            className: "edit-input text-sm font-serif",
                                            autoFocus: true,
                                            value: editValue,
                                            onChange: e => setEditValue(e.target.value),
                                            onBlur: () => saveEdit('topic', topic),
                                            onKeyDown: e => e.key === 'Enter' && saveEdit('topic', topic)
                                        }) :
                                        React.createElement(React.Fragment, null,
                                            React.createElement('span', {
                                                className: `text-sm font-serif ${topic.t && topic.r > 0 && topic.q ? 'strikethrough' : ''}`
                                            }, topic.title),
                                            React.createElement('button', {
                                                onClick: () => startEdit(topic.id, topic.title),
                                                className: "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black"
                                            }, React.createElement(Icon, { name: "pencil", size: 12 }))
                                        )
                                ),
                                React.createElement('div', {
                                    className: "flex gap-4 font-mono text-xs select-none items-center"
                                },
                                    React.createElement('span', {
                                        onClick: () => onToggleTopic(topic.id, 't'),
                                        className: `trq-toggle ${topic.t ? 'active' : ''}`
                                    }, "[T]"),
                                    React.createElement('span', {
                                        onClick: () => onToggleTopic(topic.id, 'r'),
                                        className: `trq-toggle ${topic.r > 0 ? 'active' : ''}`
                                    }, `[R${topic.r > 0 ? topic.r : ''}]`),
                                    React.createElement('span', {
                                        onClick: () => onToggleTopic(topic.id, 'q'),
                                        className: `trq-toggle ${topic.q ? 'active' : ''}`
                                    }, "[Q]"),
                                    React.createElement('button', {
                                        onClick: () => onDeleteTopic(topic.id),
                                        className: "opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 ml-2"
                                    }, React.createElement(Icon, { name: "x", size: 12 }))
                                )
                            )
                        ),
                        addingTopicTo === sub.id ?
                            React.createElement('div', {
                                className: "flex gap-2 items-center py-2"
                            },
                                React.createElement('input', {
                                    autoFocus: true,
                                    className: "bg-transparent border-b border-dashed border-gray-300 text-sm font-serif w-full",
                                    placeholder: "Nome do tópico...",
                                    value: newTopicName,
                                    onChange: e => setNewTopicName(e.target.value),
                                    onKeyDown: e => e.key === 'Enter' && handleAddTopic(sub.id)
                                }),
                                React.createElement('button', {
                                    onClick: () => handleAddTopic(sub.id),
                                    className: "text-xs font-mono text-green-600"
                                }, "OK"),
                                React.createElement('button', {
                                    onClick: () => setAddingTopicTo(null),
                                    className: "text-xs font-mono text-gray-400"
                                }, "X")
                            ) :
                            React.createElement('button', {
                                onClick: () => setAddingTopicTo(sub.id),
                                className: "text-xs font-mono text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1"
                            },
                                React.createElement(Icon, { name: "plus", size: 12 }),
                                "Adicionar Tópico"
                            )
                    )
                );
            })
        )
    );
}

// Componente AuthScreen
function AuthScreen({ onLogin }) {
    const [isRegister, setIsRegister] = React.useState(false);
    const [formData, setFormData] = React.useState({ username: '', password: '' });
    const [error, setError] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!formData.username || !formData.password) return setError('Preencha todos os campos');

        const users = JSON.parse(localStorage.getItem('studyApp_users') || '[]');
        if (isRegister) {
            if (users.find(u => u.username === formData.username)) return setError('Usuário já existe');
            const newUser = { username: formData.username, password: formData.password };
            localStorage.setItem('studyApp_users', JSON.stringify([...users, newUser]));
            onLogin(newUser);
        } else {
            const user = users.find(u => u.username === formData.username && u.password === formData.password);
            if (user) onLogin(user);
            else setError('Credenciais inválidas');
        }
    };

    return React.createElement('div', {
        className: "min-h-screen flex-center fade-in"
    },
        React.createElement('div', {
            className: "w-full max-w-md p-8 border-line bg-white/50 rounded-lg text-center"
        },
            React.createElement('div', { className: "mb-6 flex-center" },
                React.createElement('div', {
                    className: "p-4 rounded-full bg-[#E3D5CA] text-[#2D2D2D]"
                }, React.createElement(Icon, { name: "book-open", size: 32 }))
            ),
            React.createElement('h1', {
                className: "text-3xl font-serif font-bold mb-2"
            }, "Planejamento de Estudos"),
            React.createElement('p', {
                className: "text-gray-500 font-mono text-xs mb-8 uppercase tracking-widest"
            }, "Foco. Clareza. Resultado."),
            React.createElement('form', {
                onSubmit: handleSubmit,
                className: "space-y-4 text-left"
            },
                error && React.createElement('div', {
                    className: "text-xs text-[#A63D40] font-mono text-center mb-4"
                }, error),
                React.createElement('input', {
                    type: "text",
                    value: formData.username,
                    onChange: e => setFormData({ ...formData, username: e.target.value }),
                    className: "w-full bg-transparent border-b-line p-2 font-serif text-lg focus:border-[#2D2D2D]",
                    placeholder: "Usuário"
                }),
                React.createElement('input', {
                    type: "password",
                    value: formData.password,
                    onChange: e => setFormData({ ...formData, password: e.target.value }),
                    className: "w-full bg-transparent border-b-line p-2 font-serif text-lg focus:border-[#2D2D2D]",
                    placeholder: "Senha"
                }),
                React.createElement('button', {
                    className: "w-full bg-[#2D2D2D] text-[#FDFBF7] py-3 mt-4 font-mono uppercase tracking-widest text-sm hover:bg-black transition-colors"
                }, isRegister ? 'Criar Conta' : 'Entrar')
            ),
            React.createElement('div', {
                className: "mt-6 pt-6 border-t-line"
            },
                React.createElement('button', {
                    onClick: () => { setIsRegister(!isRegister); setError(''); },
                    className: "text-xs font-mono text-gray-500 hover:text-[#2D2D2D] underline decoration-dotted"
                }, isRegister ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastrar')
            )
        )
    );
}

// Componente PlanList
function PlanList({ user, onSelectPlan, onLogout }) {
    const [plans, setPlans] = React.useState([]);
    const [showNewModal, setShowNewModal] = React.useState(false);
    const [newPlanName, setNewPlanName] = React.useState('');

    React.useEffect(() => {
        const userPlans = JSON.parse(localStorage.getItem(`app_plans_${user.username}`) || '[]');
        setPlans(userPlans);
    }, [user]);

    const createPlan = (e) => {
        e.preventDefault();
        if (!newPlanName) return;
        const newPlan = {
            id: Date.now().toString(),
            title: newPlanName,
            examDate: "",
            subjects: INITIAL_SUBJECTS,
            topics: INITIAL_TOPICS,
            sessions: [],
            queueIds: INITIAL_SUBJECTS.map(s => s.id),
            createdAt: new Date().toISOString()
        };
        const updatedPlans = [...plans, newPlan];
        setPlans(updatedPlans);
        localStorage.setItem(`app_plans_${user.username}`, JSON.stringify(updatedPlans));
        setShowNewModal(false);
        setNewPlanName('');
    };

    const deletePlan = (id, e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir?')) {
            const updated = plans.filter(p => p.id !== id);
            setPlans(updated);
            localStorage.setItem(`app_plans_${user.username}`, JSON.stringify(updated));
        }
    };

    return React.createElement('div', {
        className: "min-h-screen flex-col-center fade-in p-4"
    },
        React.createElement('div', {
            className: "w-full max-w-2xl"
        },
            React.createElement('header', {
                className: "flex justify-between items-end mb-8 border-b-line pb-4"
            },
                React.createElement('div', null,
                    React.createElement('h1', {
                        className: "text-3xl font-serif font-bold mb-1"
                    }, "Seus Cadernos"),
                    React.createElement('p', {
                        className: "text-xs font-mono text-gray-400 uppercase tracking-widest"
                    }, `Olá, ${user.username}`)
                ),
                React.createElement('button', {
                    onClick: onLogout,
                    className: "text-xs font-mono text-[#A63D40] hover:underline"
                }, "Sair")
            ),
            React.createElement('div', {
                className: "grid gap-4 md:grid-cols-2"
            },
                React.createElement('button', {
                    onClick: () => setShowNewModal(true),
                    className: "border-line border-dashed p-8 flex-col-center gap-4 text-gray-400 hover:text-[#2D2D2D] hover:border-[#2D2D2D] transition-colors group h-48"
                },
                    React.createElement(Icon, { name: "plus", size: 32 }),
                    React.createElement('span', {
                        className: "font-mono text-xs uppercase tracking-widest"
                    }, "Novo Plano")
                ),
                plans.map(p =>
                    React.createElement('div', {
                        key: p.id,
                        onClick: () => onSelectPlan(p.id),
                        className: "border-line p-6 relative group hover:border-[#2D2D2D] transition-colors cursor-pointer bg-white/50 h-48 flex-col justify-between"
                    },
                        React.createElement('div', null,
                            React.createElement('h3', {
                                className: "font-serif font-bold text-xl mb-2"
                            }, p.title),
                            React.createElement('p', {
                                className: "text-xs font-mono text-gray-500"
                            }, `Prova: ${p.examDate ? new Date(p.examDate).toLocaleDateString() : 'Indefinida'}`)
                        ),
                        React.createElement('div', {
                            className: "flex justify-between items-end"
                        },
                            React.createElement('span', {
                                className: "text-xs font-mono text-gray-400"
                            }, `${p.topics.length} Tópicos`),
                            React.createElement('button', {
                                onClick: (e) => deletePlan(p.id, e),
                                className: "text-gray-300 hover:text-[#A63D40] opacity-0 group-hover:opacity-100 transition-opacity"
                            }, React.createElement(Icon, { name: "trash-2", size: 16 }))
                        )
                    )
                )
            ),
            showNewModal && React.createElement('div', {
                className: "fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex-center p-4"
            },
                React.createElement('div', {
                    className: "bg-[#FDFBF7] border-line p-8 rounded shadow-xl w-full max-w-sm"
                },
                    React.createElement('h3', {
                        className: "font-serif font-bold text-xl mb-6"
                    }, "Novo Plano de Estudos"),
                    React.createElement('input', {
                        autoFocus: true,
                        value: newPlanName,
                        onChange: e => setNewPlanName(e.target.value),
                        className: "w-full bg-transparent border-b-line p-2 font-serif text-lg mb-6 focus:border-[#2D2D2D]",
                        placeholder: "Nome do Concurso"
                    }),
                    React.createElement('div', {
                        className: "flex gap-4"
                    },
                        React.createElement('button', {
                            onClick: () => setShowNewModal(false),
                            className: "flex-1 py-3 border-line font-mono text-xs uppercase tracking-widest hover:bg-gray-100"
                        }, "Cancelar"),
                        React.createElement('button', {
                            onClick: createPlan,
                            disabled: !newPlanName,
                            className: "flex-1 py-3 bg-[#2D2D2D] text-[#FDFBF7] font-mono text-xs uppercase tracking-widest hover:bg-black disabled:opacity-50"
                        }, "Criar")
                    )
                )
            )
        )
    );
}

// Componente StudyWorkspace
function StudyWorkspace({ user, plan, onBack }) {
    const [view, setView] = React.useState('dashboard');
    const [items, setItems] = React.useState(plan.topics || []);
    const [settings, setSettings] = React.useState({ title: plan.title, examDate: plan.examDate });
    const [sessions, setSessions] = React.useState(plan.sessions || []);
    const [subjects, setSubjects] = React.useState(plan.subjects || []);
    const [queueIds, setQueueIds] = React.useState(plan.queueIds || []);
    const [activeSubject, setActiveSubject] = React.useState(null);
    const [suggestionModalOpen, setSuggestionModalOpen] = React.useState(false);
    const [suggestion, setSuggestion] = React.useState(null);
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [isEditingDate, setIsEditingDate] = React.useState(false);

    React.useEffect(() => {
        const allPlans = JSON.parse(localStorage.getItem(`app_plans_${user.username}`) || '[]');
        const updatedPlans = allPlans.map(p => {
            if (p.id === plan.id) {
                return {
                    ...p,
                    title: settings.title,
                    examDate: settings.examDate,
                    topics: items,
                    sessions: sessions,
                    subjects: subjects,
                    queueIds: queueIds
                };
            }
            return p;
        });
        localStorage.setItem(`app_plans_${user.username}`, JSON.stringify(updatedPlans));
    }, [items, settings, sessions, subjects, queueIds, user.username, plan.id]);

    const queueSubjects = React.useMemo(() =>
        queueIds.map(id => subjects.find(s => s.id === id)).filter(Boolean),
        [queueIds, subjects]
    );

    const dailyStats = React.useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s => s.date.startsWith(today));
        return {
            questions: todaySessions.reduce((acc, s) => acc + (s.questions || 0), 0),
            reviews: items.filter(t => t.lastInteraction && t.lastInteraction.startsWith(today) && t.r > 0).length,
            time: Math.floor(todaySessions.reduce((acc, s) => acc + s.executedSeconds, 0) / 60)
        };
    }, [sessions, items]);

    const rotateQueue = () => setQueueIds(prev => {
        const [first, ...rest] = prev;
        return [...rest, first];
    });

    const handlePlay = (subject) => {
        if (!subject) return;
        setActiveSubject(subject);
        setView('pomodoro');
    };

    const handleFinishSession = (sessionData) => {
        const newSession = { id: Date.now(), date: new Date().toISOString(), ...sessionData };
        setSessions(prev => [newSession, ...prev]);
        rotateQueue();
        setActiveSubject(null);
        setView('dashboard');
    };

    const handleSuggestStudy = () => {
        if (queueSubjects.length === 0) return;
        const nextSubject = queueSubjects[0];
        const subjectTopics = items.filter(t => t.subjectId === nextSubject.id);
        let recommendedTopic = subjectTopics.find(t => !t.t);
        if (!recommendedTopic) {
            recommendedTopic = subjectTopics.sort((a, b) =>
                (a.lastInteraction ? new Date(a.lastInteraction) : 0) -
                (b.lastInteraction ? new Date(b.lastInteraction) : 0)
            )[0];
        }

        setSuggestion({
            subject: nextSubject.name,
            topic: recommendedTopic ? recommendedTopic.title : "Revisão Geral",
            reason: recommendedTopic && !recommendedTopic.t ? "Teoria pendente" : "Revisão agendada"
        });
        setSuggestionModalOpen(true);
    };

    const handleAddSubject = (name) => {
        const newId = 's_' + Date.now();
        setSubjects(prev => [...prev, { id: newId, name, weight: 1 }]);
        setQueueIds(prev => [...prev, newId]);
    };

    const handleUpdateSubject = (id, name) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    };

    const handleDeleteSubject = (id) => {
        if (confirm('Excluir disciplina?')) {
            setSubjects(prev => prev.filter(s => s.id !== id));
            setItems(prev => prev.filter(t => t.subjectId !== id));
            setQueueIds(prev => prev.filter(qid => qid !== id));
        }
    };

    const handleAddTopic = (subjectId, title) => {
        setItems(prev => [...prev, {
            id: 't_' + Date.now(),
            subjectId,
            title,
            t: false,
            r: 0,
            q: false,
            lastInteraction: null
        }]);
    };

    const handleUpdateTopic = (id, title) => {
        setItems(prev => prev.map(t => t.id === id ? { ...t, title } : t));
    };

    const handleDeleteTopic = (id) => {
        setItems(prev => prev.filter(t => t.id !== id));
    };

    const handleToggleTopic = (id, type) => {
        setItems(prev => prev.map(t => {
            if (t.id !== id) return t;
            let updated = { ...t, lastInteraction: new Date().toISOString() };
            if (type === 'r') updated.r = (t.r + 1) > 3 ? 0 : t.r + 1;
            else updated[type] = !t[type];
            return updated;
        }));
    };

    // Render Dashboard View
    const renderDashboard = () => {
        return React.createElement('div', {
            className: "flex flex-col h-full fade-in"
        },
            React.createElement('header', {
                className: "flex justify-between items-end border-b-line pb-4 mb-12"
            },
                React.createElement('div', { className: "flex-1" },
                    React.createElement('span', {
                        className: "text-xs font-mono text-gray-400 uppercase tracking-widest block mb-1"
                    }, "Foco Atual"),
                    isEditingTitle ?
                        React.createElement('input', {
                            className: "edit-input text-2xl font-serif text-[#2D2D2D] font-bold",
                            autoFocus: true,
                            value: settings.title,
                            onChange: e => setSettings({ ...settings, title: e.target.value }),
                            onBlur: () => setIsEditingTitle(false),
                            onKeyDown: e => e.key === 'Enter' && setIsEditingTitle(false)
                        }) :
                        React.createElement('h1', {
                            className: "text-2xl font-serif text-[#2D2D2D] cursor-pointer hover:underline decoration-dotted decoration-gray-300 underline-offset-4",
                            onClick: () => setIsEditingTitle(true)
                        }, settings.title)
                ),
                React.createElement('div', { className: "text-right" },
                    React.createElement('span', {
                        className: "text-xs font-mono text-gray-400 uppercase tracking-widest block mb-1"
                    }, "Data da Prova"),
                    isEditingDate ?
                        React.createElement('input', {
                            type: "date",
                            className: "edit-input font-mono text-right text-[#A63D40]",
                            value: settings.examDate,
                            onChange: e => setSettings({ ...settings, examDate: e.target.value }),
                            onBlur: () => setIsEditingDate(false),
                            autoFocus: true
                        }) :
                        React.createElement('span', {
                            className: "text-xl font-mono text-[#A63D40] cursor-pointer hover:underline decoration-dotted",
                            onClick: () => setIsEditingDate(true)
                        }, `${calculateDaysLeft(settings.examDate)} DIAS`)
                )
            ),
            React.createElement('div', {
                className: "flex-1 flex-col-center mb-12"
            },
                React.createElement('div', {
                    className: "relative w-72 h-72 flex-center mb-10"
                },
                    React.createElement('svg', {
                        viewBox: "0 0 100 100",
                        className: "w-full h-full transform -rotate-90"
                    },
                        React.createElement('circle', {
                            cx: "50",
                            cy: "50",
                            r: "45",
                            fill: "none",
                            stroke: "#E0E0E0",
                            strokeWidth: "1"
                        }),
                        React.createElement('circle', {
                            cx: "50",
                            cy: "50",
                            r: "45",
                            fill: "none",
                            stroke: "#2D2D2D",
                            strokeWidth: "2",
                            strokeDasharray: "210 280",
                            strokeLinecap: "square"
                        })
                    ),
                    React.createElement('div', {
                        className: "absolute inset-0 flex-col-center p-8 text-center"
                    },
                        React.createElement('span', {
                            className: "text-[10px] font-mono text-gray-400 mb-2"
                        }, "AGORA"),
                        React.createElement('h2', {
                            className: "text-2xl font-bold font-serif leading-tight text-[#2D2D2D] break-words w-full"
                        }, queueSubjects[0]?.name || 'Adicione Matérias')
                    )
                ),
                queueSubjects.length > 0 && React.createElement('div', {
                    className: "flex items-center gap-8"
                },
                    React.createElement('button', {
                        onClick: rotateQueue,
                        className: "flex-col-center gap-2 text-gray-400 hover:text-[#A63D40] transition-colors group"
                    },
                        React.createElement('div', {
                            className: "w-12 h-12 border-line rounded-full flex-center group-hover:border-[#A63D40] transition-colors"
                        }, React.createElement(Icon, { name: "skip-forward", size: 20 })),
                        React.createElement('span', {
                            className: "text-[10px] font-mono uppercase tracking-widest"
                        }, "Pular")
                    ),
                    React.createElement('button', {
                        onClick: () => handlePlay(queueSubjects[0]),
                        className: "flex-col-center gap-3 group"
                    },
                        React.createElement('div', {
                            className: "w-24 h-24 bg-[#2D2D2D] text-[#FDFBF7] rounded-full flex-center shadow-xl hover:scale-105 transition-transform"
                        }, React.createElement(Icon, { name: "play", size: 40, className: "ml-1" })),
                        React.createElement('span', {
                            className: "text-xs font-mono font-bold uppercase tracking-widest text-[#2D2D2D]"
                        }, "Estudar")
                    ),
                    React.createElement('button', {
                        onClick: handleSuggestStudy,
                        className: "flex-col-center gap-2 text-gray-400 hover:text-blue-600 transition-colors group"
                    },
                        React.createElement('div', {
                            className: "w-12 h-12 border-line rounded-full flex-center group-hover:border-blue-600 transition-colors"
                        }, React.createElement(Icon, { name: "lightbulb", size: 20 })),
                        React.createElement('span', {
                            className: "text-[10px] font-mono uppercase tracking-widest"
                        }, "Sugestão")
                    )
                ),
                React.createElement('div', {
                    className: "mt-12 text-center"
                },
                    React.createElement('span', {
                        className: "text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-2"
                    }, "A SEGUIR"),
                    React.createElement('div', {
                        className: "py-2 px-6 border-line inline-block bg-white/50"
                    },
                        React.createElement('span', {
                            className: "font-serif text-gray-600"
                        }, queueSubjects[1]?.name || '...')
                    )
                )
            ),
            React.createElement('footer', {
                className: "mt-auto border-t-line pt-4 flex justify-between text-sm font-mono text-gray-500"
            },
                React.createElement('div', { className: "flex gap-6" },
                    React.createElement('span', { className: "flex items-center gap-2" },
                        React.createElement(Icon, { name: "check-circle", size: 14 }),
                        `${dailyStats.questions} Questões`
                    ),
                    React.createElement('span', { className: "flex items-center gap-2" },
                        React.createElement(Icon, { name: "rotate-cw", size: 14 }),
                        `${dailyStats.reviews} Revisões`
                    )
                ),
                React.createElement('div', null,
                    React.createElement('span', { className: "flex items-center gap-2" },
                        `Tempo Líquido: ${Math.floor(dailyStats.time / 60)}h ${dailyStats.time % 60}m`
                    )
                )
            ),
            React.createElement(Modal, {
                isOpen: suggestionModalOpen,
                title: "Próximo Passo Recomendado",
                onClose: () => setSuggestionModalOpen(false)
            },
                suggestion && React.createElement('div', { className: "space-y-4" },
                    React.createElement('div', { className: "p-4 border-line bg-white/50" },
                        React.createElement('span', {
                            className: "text-xs font-mono text-gray-400 uppercase"
                        }, "Disciplina"),
                        React.createElement('p', {
                            className: "text-lg font-bold font-serif text-[#2D2D2D]"
                        }, suggestion.subject)
                    ),
                    React.createElement('div', { className: "p-4 border-line bg-white/50" },
                        React.createElement('span', {
                            className: "text-xs font-mono text-gray-400 uppercase"
                        }, "Tópico"),
                        React.createElement('p', {
                            className: "text-lg font-serif text-gray-700"
                        }, suggestion.topic)
                    ),
                    React.createElement('div', {
                        className: "p-4 bg-[#E3D5CA]/20 border border-[#E3D5CA] rounded"
                    },
                        React.createElement('span', {
                            className: "text-xs font-mono text-gray-500 uppercase"
                        }, "Por que?"),
                        React.createElement('p', {
                            className: "text-sm font-serif italic text-gray-600"
                        }, suggestion.reason)
                    ),
                    React.createElement('button', {
                        onClick: () => {
                            setSuggestionModalOpen(false);
                            handlePlay(subjects.find(s => s.name === suggestion.subject));
                        },
                        className: "w-full bg-[#2D2D2D] text-[#FDFBF7] py-3 font-mono text-xs uppercase tracking-widest hover:bg-black"
                    }, "Iniciar Agora")
                )
            )
        );
    };

    return React.createElement('div', {
        className: "flex h-screen overflow-hidden"
    },
        React.createElement('div', { className: "paper-grid" }),
        React.createElement('aside', {
            className: "w-16 md:w-20 border-r-line flex-col items-center py-8 gap-8 bg-[#FDFBF7] z-50"
        },
            React.createElement('div', {
                className: "mb-4 cursor-pointer",
                onClick: onBack,
                title: "Voltar aos Planos"
            },
                React.createElement('div', {
                    className: "w-8 h-8 bg-[#2D2D2D] rounded-sm flex-center text-[#FDFBF7]"
                },
                    React.createElement('span', {
                        className: "font-serif font-bold text-lg"
                    }, "E")
                )
            ),
            React.createElement('nav', {
                className: "flex-col gap-6 w-full"
            },
                [{ id: 'dashboard', icon: 'layout' }, { id: 'syllabus', icon: 'list-tree' }, { id: 'data', icon: 'bar-chart-2' }].map(item =>
                    React.createElement('button', {
                        key: item.id,
                        onClick: () => setView(item.id),
                        className: `w-full py-3 flex justify-center transition-all group ${view === item.id ? 'text-[#2D2D2D]' : 'text-gray-300 hover:text-gray-500'}`
                    },
                        React.createElement(Icon, { name: item.icon, size: 22 }),
                        view === item.id && React.createElement('div', {
                            className: "absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#2D2D2D]"
                        })
                    )
                )
            )
        ),
        React.createElement('main', {
            className: "flex-1 overflow-y-auto p-8 md:p-12 relative"
        },
            React.createElement('div', {
                className: "relative z-10 h-full max-w-5xl mx-auto"
            },
                view === 'dashboard' && renderDashboard(),
                view === 'pomodoro' && activeSubject &&
                    React.createElement(Pomodoro, {
                        subject: activeSubject,
                        onFinish: handleFinishSession,
                        onCancel: () => setView('dashboard')
                    }),
                view === 'syllabus' &&
                    React.createElement(Syllabus, {
                        subjects: subjects,
                        topics: items,
                        onAddSubject: handleAddSubject,
                        onAddTopic: handleAddTopic,
                        onUpdateSubject: handleUpdateSubject,
                        onUpdateTopic: handleUpdateTopic,
                        onDeleteSubject: handleDeleteSubject,
                        onDeleteTopic: handleDeleteTopic,
                        onToggleTopic: handleToggleTopic
                    }),
                view === 'data' &&
                    React.createElement(DataAnalytics, {
                        sessions: sessions,
                        subjects: subjects
                    })
            )
        )
    );
}

// Componente App Principal
function App() {
    const [user, setUser] = React.useState(null);
    const [activePlan, setActivePlan] = React.useState(null);

    React.useEffect(() => {
        const savedUser = localStorage.getItem('study_user');
        if (savedUser) setUser(JSON.parse(savedUser));
    }, []);

    const handleLogin = (loggedUser) => {
        setUser(loggedUser);
        localStorage.setItem('study_user', JSON.stringify(loggedUser));
    };

    const handleLogout = () => {
        setUser(null);
        setActivePlan(null);
        localStorage.removeItem('study_user');
    };

    const handleSelectPlan = (planId) => {
        const plans = JSON.parse(localStorage.getItem(`app_plans_${user.username}`) || '[]');
        const plan = plans.find(p => p.id === planId);
        setActivePlan(plan);
    };

    const handleBackToPlans = () => setActivePlan(null);

    if (!user) return React.createElement(AuthScreen, { onLogin: handleLogin });
    if (!activePlan) return React.createElement(PlanList, {
        user: user,
        onSelectPlan: handleSelectPlan,
        onLogout: handleLogout
    });
    return React.createElement(StudyWorkspace, {
        user: user,
        plan: activePlan,
        onBack: handleBackToPlans
    });
}

// Renderizar aplicação
document.addEventListener('DOMContentLoaded', function() {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
    
    // Re-inicializar ícones após renderização
    setTimeout(() => {
        if (window.lucide) {
            lucide.createIcons();
        }
    }, 100);
});
