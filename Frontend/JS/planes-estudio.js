// Planes de Estudio - Lógica principal
window.StudyPlansManager = window.StudyPlansManager || class StudyPlansManager {
    constructor() {
        this.currentUser = null;
        this.studyPlans = [];
        this.currentEditingPlan = null;
        this.isLoading = false;
        this.authModule = null;
        this.apiModule = null;

        this.init();
    }

    init() {
        // Evitar listeners duplicados si la instancia se reusa
        if (this._inited) return;
        this._inited = true;
        // Inicializar módulos si están disponibles
        this.authModule = window.authModule || this.authModule;
        this.apiModule = window.apiModule || this.apiModule;

        // Listeners del modal de creación/edición
        const createBtn = document.getElementById('createPlanBtn');
        if (createBtn) createBtn.addEventListener('click', () => this.openCreateModal());

        const createFirstBtn = document.getElementById('createFirstPlanBtn');
        if (createFirstBtn) createFirstBtn.addEventListener('click', () => this.openCreateModal());

        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.addTaskToForm());
        
        // Agregar event listener global para botones "Ver detalles" (expandir tarjeta, no modal)
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.action-btn.view-plan');
            if (viewBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = viewBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) {
                    this.expandCard(card, plan);
                }
            }
        });

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());

        const form = document.getElementById('studyPlanForm');
        if (form) form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Listeners de filtros y búsqueda
        const resetFiltersBtn = document.getElementById('resetFilters');
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => this.resetAllFilters());

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.addEventListener('input', () => this.applyFilters());

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());

        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) priorityFilter.addEventListener('change', () => this.applyFilters());

        const sortBy = document.getElementById('sortBy');
        if (sortBy) sortBy.addEventListener('change', () => this.applyFilters());

        // Listeners del modal de detalles
        const closeDetailsBtn = document.getElementById('closeDetailsBtn');
        if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => this.closeDetailsModal());

        const editPlanBtn = document.getElementById('editPlanBtn');
        if (editPlanBtn) editPlanBtn.addEventListener('click', () => this.editCurrentPlan());

        const deletePlanBtn = document.getElementById('deletePlanBtn');
        if (deletePlanBtn) deletePlanBtn.addEventListener('click', () => this.deleteCurrentPlan());

        // Delegación de eventos global para garantizar funcionamiento de botones dinámicos
        document.addEventListener('click', (e) => {
            // Ver detalles de tarjeta (expandir en la tarjeta, sin modal)
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = viewBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) {
                    this.expandCard(card, plan);
                    return;
                }
            }

            // Acciones de tareas en vista expandida
            const editTaskBtn = e.target.closest('.btn-edit-task');
            if (editTaskBtn) {
                e.preventDefault();
                const taskItem = editTaskBtn.closest('.task-item');
                const taskId = taskItem?.getAttribute('data-task-id');
                if (taskId) this.editTask(taskId);
                return;
            }

            const toggleTaskBtn = e.target.closest('.btn-toggle-task');
            if (toggleTaskBtn) {
                e.preventDefault();
                const taskItem = toggleTaskBtn.closest('.task-item');
                const taskId = taskItem?.getAttribute('data-task-id');
                if (taskId) this.toggleTaskCompletion(taskId);
                return;
            }

            const deleteTaskBtn = e.target.closest('.btn-delete-task');
            if (deleteTaskBtn) {
                e.preventDefault();
                const taskItem = deleteTaskBtn.closest('.task-item');
                const taskId = taskItem?.getAttribute('data-task-id');
                if (taskId) this.deleteTask(taskId);
                return;
            }

            const viewTaskBtn = e.target.closest('.btn-view-task');
            if (viewTaskBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = viewTaskBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) {
                    // Activar pestaña de Tareas dentro de la misma tarjeta
                    const tasksTabBtn = card.querySelector('.tab-btn[data-tab="tasks"]');
                    if (tasksTabBtn) {
                        tasksTabBtn.click();
                        // Intentar centrar el elemento de tarea en la vista
                        const taskItem = viewTaskBtn.closest('.task-item');
                        setTimeout(() => {
                            if (taskItem) taskItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                }
                return;
            }

            // Cerrar vista expandida
            const closeExpandedBtn = e.target.closest('.close-expanded-btn');
            if (closeExpandedBtn) {
                e.preventDefault();
                const card = closeExpandedBtn.closest('.study-plan-card');
                if (card) this.collapseCard(card);
                return;
            }

            // Tabs dentro de la vista expandida (delegado)
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = tabBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (!card || !plan) return;

                const targetTab = tabBtn.getAttribute('data-tab');
                const tabBtns = card.querySelectorAll('.tab-btn');
                const tabPanels = card.querySelectorAll('.tab-panel');

                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                tabBtn.classList.add('active');
                const targetPanel = card.querySelector(`[data-panel="${targetTab}"]`);
                if (targetPanel) targetPanel.classList.add('active');

                this.loadTabContent(card, plan, targetTab);
                return;
            }

            // Guardar cambios desde pestaña Editar (delegado)
            const saveEditBtn = e.target.closest('.save-edit');
            if (saveEditBtn) {
                e.preventDefault();
                const card = saveEditBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) this.saveExpandedPlan(card, plan);
                return;
            }

            // Cancelar edición y volver a Resumen (delegado)
            const cancelEditBtn = e.target.closest('.cancel-edit');
            if (cancelEditBtn) {
                e.preventDefault();
                const card = cancelEditBtn.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (!card || !plan) return;

                // Restablecer valores del formulario de edición
                this.populateEditForm(card, plan);

                // Cambiar pestaña activa a Resumen
                const tabBtns = card.querySelectorAll('.tab-btn');
                const tabPanels = card.querySelectorAll('.tab-panel');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                const overviewBtn = card.querySelector('.tab-btn[data-tab="overview"]');
                const overviewPanel = card.querySelector('.tab-panel[data-panel="overview"]');
                if (overviewBtn) overviewBtn.classList.add('active');
                if (overviewPanel) overviewPanel.classList.add('active');
                return;
            }

            // Acciones para agregar tarea/contenido (delegado)
            const addTaskBtnDelegated = e.target.closest('.add-task-btn');
            if (addTaskBtnDelegated) {
                e.preventDefault();
                const card = addTaskBtnDelegated.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) this.openAddTaskForm(card, plan);
                return;
            }

            const addContentBtnDelegated = e.target.closest('.add-content-btn');
            if (addContentBtnDelegated) {
                e.preventDefault();
                const card = addContentBtnDelegated.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const plan = this.studyPlans.find(p => String(p.id) === String(planId));
                if (card && plan) this.openAddContentForm(card, plan);
                return;
            }
        });

        // Delegación para cambios de estado del plan (select)
        document.addEventListener('change', (e) => {
            const statusSelect = e.target.closest('.status-select');
            if (statusSelect) {
                e.stopPropagation();
                const card = statusSelect.closest('.study-plan-card');
                const planId = card?.getAttribute('data-plan-id');
                const newStatus = statusSelect.value;
                if (planId && newStatus) this.setPlanStatus(planId, newStatus);
            }
        });

        // Cargar planes inicialmente
        this.loadStudyPlans().catch(err => {
            console.error('Error cargando planes:', err);
            this.showError('No se pudieron cargar los planes');
        });
    }

    getBaseUrl() {
        try {
            const cfg = window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL;
            return cfg || window.location.origin;
        } catch {
            return window.location.origin;
        }
    }

    calculateDaysRemaining(dateStr) {
        if (!dateStr) return 0;
        const end = new Date(dateStr);
        const today = new Date();
        end.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffMs = end.getTime() - today.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(days, 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Persistencia de pestaña activa por plan
    getPersistedTab(planId) {
        try {
            return localStorage.getItem(`planTab:${planId}`) || null;
        } catch (_) {
            return null;
        }
    }

    setPersistedTab(planId, tabName) {
        try {
            localStorage.setItem(`planTab:${planId}`, tabName);
        } catch (_) {
            // ignorar errores de almacenamiento
        }
    }

    setupExpandedTabs(cardElement, plan) {
        const tabBtns = cardElement.querySelectorAll('.tab-btn');
        const tabPanels = cardElement.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetTab = btn.getAttribute('data-tab');

                // Remover clase active de todos los botones y paneles
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));

                // Activar el botón y panel seleccionado
                btn.classList.add('active');
                const targetPanel = cardElement.querySelector(`[data-panel="${targetTab}"]`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                // Persistir pestaña activa para este plan
                this.setPersistedTab(plan.id, targetTab);

                // Cargar contenido específico de la pestaña
                this.loadTabContent(cardElement, plan, targetTab);
            });
        });
    }

    populateExpandedView(cardElement, plan) {
        // Estadísticas del resumen
        const tasksTotal = cardElement.querySelector('.tasks-total');
        const tasksCompleted = cardElement.querySelector('.tasks-completed');
        const tasksPending = cardElement.querySelector('.tasks-pending');
        const daysRemaining = cardElement.querySelector('.days-remaining');

        const totalTasks = plan.plan_tasks ? plan.plan_tasks.length : 0;
        const completedTasks = plan.plan_tasks ? plan.plan_tasks.filter(task => task.completed).length : 0;
        const pendingTasks = totalTasks - completedTasks;
        const daysLeft = this.calculateDaysRemaining(plan.end_date);

        if (tasksTotal) tasksTotal.textContent = totalTasks;
        if (tasksCompleted) tasksCompleted.textContent = completedTasks;
        if (tasksPending) tasksPending.textContent = pendingTasks;
        if (daysRemaining) daysRemaining.textContent = daysLeft;

        // Barra de progreso grande
        const progressFillLarge = cardElement.querySelector('.progress-fill-large');
        const progressTextLarge = cardElement.querySelector('.progress-text-large');

        if (progressFillLarge) progressFillLarge.style.width = `${plan.progress || 0}%`;
        if (progressTextLarge) progressTextLarge.textContent = `${plan.progress || 0}% Completado`;

        // Formulario de edición
        this.populateEditForm(cardElement, plan);
    }

    loadTabContent(cardElement, plan, tabName) {
        switch (tabName) {
            case 'tasks':
                this.loadTasksTab(cardElement, plan);
                break;
            case 'content':
                this.loadContentTab(cardElement, plan);
                break;
            case 'edit':
                this.loadEditTab(cardElement, plan);
                break;
            default:
                // Recalcular y repintar resumen al volver a la pestaña
                this.populateExpandedView(cardElement, plan);
                break;
        }
    }

    loadTasksTab(cardElement, plan) {
        // Seleccionar el contenedor dentro del panel de Tareas para evitar coincidencias fuera del panel
        const tasksPanel = cardElement.querySelector('.tab-panel[data-panel="tasks"]');
        const tasksContainer = tasksPanel?.querySelector('.tasks-list-expanded') || cardElement.querySelector('.tasks-list');
        if (!tasksContainer) return;

        // Botón para agregar tarea
        const addTaskBtn = cardElement.querySelector('.add-task-btn');
        if (addTaskBtn) {
            // Se mantiene por compatibilidad, pero existe delegación global
            addTaskBtn.onclick = () => this.openAddTaskForm(cardElement, plan);
        }

        const tasks = plan.plan_tasks || [];
        if (!tasks.length) {
            tasksContainer.innerHTML = '<p class="empty-message">No hay tareas registradas en este plan.</p>';
            return;
        }

        tasksContainer.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <span class="task-title">${task.title}</span>
                <span class="task-status">${task.completed ? 'Completada' : 'Pendiente'}</span>
                <div class="task-actions">
                    <button class="btn btn-sm btn-outline-primary btn-edit-task">Editar</button>
                    <button class="btn btn-sm ${task.completed ? 'btn-warning' : 'btn-success'} btn-toggle-task">${task.completed ? 'Desmarcar' : 'Completar'}</button>
                    <button class="btn btn-sm btn-danger btn-delete-task">Eliminar</button>
                    <button class="btn btn-sm btn-secondary btn-view-task">Ver</button>
                </div>
            </div>
        `).join('');

        // Conectar acciones
        tasksContainer.querySelectorAll('.task-item').forEach(item => {
            const taskId = item.getAttribute('data-task-id');
            item.querySelector('.btn-edit-task')?.addEventListener('click', () => this.editTask(taskId));
            item.querySelector('.btn-toggle-task')?.addEventListener('click', () => this.toggleTaskCompletion(taskId));
            item.querySelector('.btn-delete-task')?.addEventListener('click', () => this.deleteTask(taskId));
            // Evitar modal: activar pestaña de tareas y enfocar elemento
            item.querySelector('.btn-view-task')?.addEventListener('click', () => {
                const tasksTabBtn = cardElement.querySelector('.tab-btn[data-tab="tasks"]');
                if (tasksTabBtn) tasksTabBtn.click();
                setTimeout(() => {
                    const currentItem = cardElement.querySelector(`.task-item[data-task-id="${taskId}"]`);
                    if (currentItem) currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        });
    }

    loadContentTab(cardElement, plan) {
        const contentContainer = cardElement.querySelector('.content-list-expanded') || cardElement.querySelector('.content-list');
        if (!contentContainer) return;

        contentContainer.innerHTML = `
            <div class="content-loading">
                <div class="skeleton-item"></div>
                <div class="skeleton-item"></div>
                <div class="skeleton-item"></div>
            </div>
        `;

        const token = this.getAuthToken();
        const base = this.getBaseUrl();

        // Botón para agregar contenido: abrir selector desde historial
        const addContentBtn = cardElement.querySelector('.add-content-btn');
        if (addContentBtn) {
            addContentBtn.onclick = () => this.openHistoryPicker(cardElement, plan);
        }

        fetch(`${base}/api/study/plans/${plan.id}/content`, {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        })
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                const items = Array.isArray(data) ? data : (data && data.contents) ? data.contents : [];
                if (!items.length) {
                    contentContainer.innerHTML = `
                    <div class="content-empty">
                        No hay contenido en este plan aún.
                        <button class="btn primary btn-sm inline-add-content">Agregar desde historial</button>
                    </div>
                `;
                    const inlineBtn = contentContainer.querySelector('.inline-add-content');
                    if (inlineBtn) inlineBtn.onclick = () => this.openHistoryPicker(cardElement, plan);
                    return;
                }

                const html = items.map(item => {
                    const type = item.content_type || 'contenido';
                    const taskTitle = item.plan_tasks?.title || '';
                    const pdfTitle = item.pdf_uploads?.title || '';
                    const title = item.title || taskTitle || pdfTitle || 'Sin título';
                    const created = item.created_at ? new Date(item.created_at).toLocaleString() : '';
                    return `
                    <div class="content-card">
                        <div class="content-card-main">
                            <span class="badge type">${type}</span>
                            <div class="title">${title}</div>
                            ${created ? `<div class="meta">${created}</div>` : ''}
                        </div>
                        <div class="content-card-actions">
                            <button class="btn secondary btn-sm view-content-btn" data-content-id="${item.id}">Abrir</button>
                        </div>
                    </div>
                `;
                }).join('');

                contentContainer.innerHTML = html;

                // Acciones
                contentContainer.querySelectorAll('.view-content-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.openContentManager(plan.id);
                    });
                });
            })
            .catch(err => {
                console.error('Error cargando contenido del plan:', err);
                // En caso de error de carga, mostrar un estado amistoso con acción
                contentContainer.innerHTML = `
                <div class="content-empty">
                    No pudimos cargar el contenido ahora.
                    <button class="btn primary btn-sm inline-add-content">Agregar desde historial</button>
                </div>
            `;
                const inlineBtn = contentContainer.querySelector('.inline-add-content');
                if (inlineBtn) inlineBtn.onclick = () => this.openHistoryPicker(cardElement, plan);
            });
    }

    // Selector inline para elegir contenido desde historial del usuario y adjuntarlo al plan
    openHistoryPicker(cardElement, plan) {
        const contentContainer = cardElement.querySelector('.content-list-expanded') || cardElement.querySelector('.content-list');
        if (!contentContainer) return;

        // Si ya hay un selector abierto, ciérralo
        const existing = contentContainer.querySelector('.history-picker-inline');
        if (existing) existing.remove();

        const picker = document.createElement('div');
        picker.className = 'history-picker-inline';
        picker.innerHTML = `
            <div class="picker-header">Agregar desde tu historial</div>
            <div class="picker-filters">
                <input type="text" id="historySearch" placeholder="Buscar por título o contenido" />
            </div>
            <div class="picker-list">
                <div class="content-loading">
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn secondary" id="cancelPickHistoryBtn">Cancelar</button>
            </div>
        `;

        contentContainer.prepend(picker);

        const cancelBtn = picker.querySelector('#cancelPickHistoryBtn');
        if (cancelBtn) cancelBtn.onclick = () => picker.remove();

        const token = this.getAuthToken();
        const base = this.getBaseUrl();

        fetch(`${base}/api/study/outputs?limit=50`, {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        })
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(outputs => {
                const listEl = picker.querySelector('.picker-list');
                if (!Array.isArray(outputs) || !outputs.length) {
                    listEl.innerHTML = `<div class="content-empty">No tienes contenido en tu historial aún</div>`;
                    return;
                }

                let all = outputs;

                const render = (items) => {
                    listEl.innerHTML = items.map(o => {
                        const title = o.pdf_title || `Contenido ${o.type}`;
                        const created = o.created_at ? new Date(o.created_at).toLocaleString() : '';
                        const snippet = typeof o.content === 'string' ? o.content.slice(0, 120) : JSON.stringify(o.content).slice(0, 120);
                        return `
                        <div class="history-item" data-output-id="${o.id}">
                            <div class="history-item-body">
                                <div class="history-title">${title}</div>
                                <div class="history-meta"><span class="badge">${o.type}</span>${created ? ` • ${created}` : ''}</div>
                                <div class="history-snippet">${snippet}${snippet.length >= 120 ? '…' : ''}</div>
                            </div>
                            <div class="history-actions">
                                <button class="btn primary btn-sm attach-output-btn" data-output-id="${o.id}">Agregar</button>
                            </div>
                        </div>
                    `;
                    }).join('');

                    // Wire up attach buttons
                    listEl.querySelectorAll('.attach-output-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            const outputId = btn.getAttribute('data-output-id');
                            await this.attachHistoryOutputToPlan(cardElement, plan, outputId, picker, btn);
                        });
                    });
                };

                // Initial render
                render(all);

                // Filtro simple (solo búsqueda)
                const searchInput = picker.querySelector('#historySearch');
                const applyFilters = () => {
                    const q = (searchInput.value || '').toLowerCase();
                    const filtered = all.filter(o => {
                        const title = (o.pdf_title || '').toLowerCase();
                        const typeStr = (o.type || '').toLowerCase();
                        const contentStr = typeof o.content === 'string' ? o.content.toLowerCase() : JSON.stringify(o.content).toLowerCase();
                        return !q || title.includes(q) || typeStr.includes(q) || contentStr.includes(q);
                    });
                    render(filtered);
                };
                searchInput.addEventListener('input', applyFilters);
            })
            .catch(err => {
                console.error('Error cargando historial:', err);
                const listEl = picker.querySelector('.picker-list');
                listEl.innerHTML = `<div class="content-error">Error al cargar tu historial</div>`;
            });
    }

    async attachHistoryOutputToPlan(cardElement, plan, outputId, pickerEl, btnEl) {
        try {
            if (btnEl) this.setButtonLoading(btnEl, true, 'Agregando...');
            const token = this.getAuthToken();
            const base = this.getBaseUrl();

            // Obtener el output completo para tener su contenido y metadatos
            const outRes = await fetch(`${base}/api/study/outputs/${outputId}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const outData = await outRes.json();
            if (!outRes.ok) throw new Error(outData?.error || 'No se pudo obtener el contenido del historial');

            const output = outData;
            // Asegurar tipos válidos para el backend
            const allowedTypes = ['resumen', 'multiple_choice', 'verdadero_falso', 'flashcards'];
            const safeType = allowedTypes.includes(output.type) ? output.type : 'resumen';

            // El backend puede esperar texto en la columna `content`.
            // Si recibimos un objeto, lo serializamos para evitar errores de inserción.
            const contentPayload = (typeof output.content === 'string')
                ? output.content
                : JSON.stringify(output.content || {});

            // Títulos muy largos pueden fallar si la columna es limitada.
            // Limitamos a 180 caracteres para mayor seguridad.
            const safeTitle = (output.pdf_title
                ? `${output.pdf_title} (${safeType})`
                : `Contenido ${safeType}`).slice(0, 180);

            const payload = {
                contentType: safeType,
                title: safeTitle,
                description: null,
                content: contentPayload,
                sourcePdfId: output.pdf_id || null,
                isExtra: false,
                extraGroupName: null
            };

            const postRes = await fetch(`${base}/api/study/plans/${plan.id}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            const postData = await postRes.json();
            if (!postRes.ok) {
                // Mensaje amigable si el tipo no es válido u otros errores
                const msg = postData?.error || 'No se pudo adjuntar el contenido al plan';
                throw new Error(msg);
            }

            // Cerrar picker y recargar pestaña
            if (pickerEl) pickerEl.remove();
            this.loadContentTab(cardElement, plan);
            const suffix = (safeType !== (output.type || '')) ? ' (guardado como resumen)' : '';
            this.showSuccess(`Contenido del historial agregado al plan${suffix}`);
        } catch (error) {
            console.error('Error adjuntando contenido desde historial:', error);
            this.showError(error.message || 'Error al agregar contenido');
        } finally {
            if (btnEl) this.setButtonLoading(btnEl, false);
        }
    }

    loadEditTab(cardElement, plan) {
        // El formulario de edición ya está poblado en populateExpandedView
    }

    populateEditForm(cardElement, plan) {
        const titleInput = cardElement.querySelector('.edit-title');
        const descInput = cardElement.querySelector('.edit-description');
        const startDateInput = cardElement.querySelector('.edit-start-date');
        const endDateInput = cardElement.querySelector('.edit-end-date');
        const statusSelect = cardElement.querySelector('.edit-status');

        if (titleInput) titleInput.value = plan.title || '';
        if (descInput) descInput.value = plan.description || '';
        if (startDateInput) startDateInput.value = plan.start_date || '';
        if (endDateInput) endDateInput.value = plan.end_date || '';
        if (statusSelect) statusSelect.value = plan.status || 'active';

        // Listeners de la pestaña Editar (alineados con el HTML)
        const saveBtn = cardElement.querySelector('.save-edit');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveExpandedPlan(cardElement, plan);
            });
        }

        const cancelBtn = cardElement.querySelector('.cancel-edit');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Restablecer valores del formulario y volver a Resumen
                this.populateEditForm(cardElement, plan);
                const tabBtns = cardElement.querySelectorAll('.tab-btn');
                const tabPanels = cardElement.querySelectorAll('.tab-panel');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                const overviewBtn = cardElement.querySelector('.tab-btn[data-tab="overview"]');
                const overviewPanel = cardElement.querySelector('.tab-panel[data-panel="overview"]');
                if (overviewBtn) overviewBtn.classList.add('active');
                if (overviewPanel) overviewPanel.classList.add('active');
                // Persistir cambio a Resumen
                this.setPersistedTab(plan.id, 'overview');
            });
        }

        // Manejar envío del formulario por Enter o acción de submit
        const editForm = cardElement.querySelector('.edit-plan-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveExpandedPlan(cardElement, plan);
            });
        }
    }

    async saveExpandedPlan(cardElement, plan) {
        const titleInput = cardElement.querySelector('.edit-title');
        const descInput = cardElement.querySelector('.edit-description');
        const startDateInput = cardElement.querySelector('.edit-start-date');
        const endDateInput = cardElement.querySelector('.edit-end-date');
        const statusSelect = cardElement.querySelector('.edit-status');
        const saveBtn = cardElement.querySelector('.save-edit');

        const updatedData = {
            title: titleInput?.value || plan.title,
            description: descInput?.value || plan.description,
            start_date: startDateInput?.value || plan.start_date,
            end_date: endDateInput?.value || plan.end_date,
            status: statusSelect?.value || plan.status
        };

        try {
            if (saveBtn) this.setButtonLoading(saveBtn, true, 'Guardando...');
            const base = this.getBaseUrl();
            const response = await fetch(`${base}/api/study/plans/${plan.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(() => { const token = this.getAuthToken(); return token ? { 'Authorization': `Bearer ${token}` } : {}; })()
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                this.showSuccess('Plan actualizado correctamente');
                await this.loadStudyPlans();
            } else {
                throw new Error('Error al actualizar el plan');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al actualizar el plan');
        } finally {
            if (saveBtn) this.setButtonLoading(saveBtn, false);
        }
    }

    async loadStudyPlans() {
        try {
            this.showLoading(true);

            const token = this.getAuthToken();
            const base = this.getBaseUrl();
            const response = await fetch(`${base}/api/study/plans`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                this.studyPlans = await response.json();
                this.renderStudyPlans();
            } else {
                throw new Error('Error al cargar los planes');
            }

        } catch (error) {
            console.error('Error cargando planes:', error);
            this.showError('Error al cargar los planes de estudio');
        } finally {
            this.showLoading(false);
        }
    }

    getAuthToken() {
        try {
            const fromModule = (this.authModule && typeof this.authModule.getAccessToken === 'function')
                ? this.authModule.getAccessToken()
                : null;
            if (fromModule) return fromModule;

            // Fallback a localStorage (formato usado en otras pantallas)
            const sessionStr = localStorage.getItem('session');
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    return session?.access_token || '';
                } catch (_) {
                    return '';
                }
            }
            return '';
        } catch (error) {
            console.error('Error obteniendo token:', error);
            return '';
        }
    }

    showEmptyState(message) {
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');
        const emptyMessage = document.getElementById('emptyMessage');
        const loadingIndicator = document.getElementById('loadingIndicator');

        if (grid) grid.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            if (emptyMessage) emptyMessage.textContent = message;
        }
    }

    renderStudyPlans() {
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');

        if (!this.studyPlans || this.studyPlans.length === 0) {
            this.showEmptyState('No tienes planes de estudio creados aún');
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (grid) {
            grid.style.display = 'grid';
            grid.innerHTML = ''; // Limpiar el grid

            // Crear y agregar cada tarjeta individualmente
            this.studyPlans.forEach(plan => {
                const cardElement = this.createPlanCard(plan);
                if (cardElement) {
                    grid.appendChild(cardElement);
                }
            });
        }
    }

    createPlanCard(plan) {
        const template = document.getElementById('studyPlanCardTemplate');
        if (!template) {
            console.error('Template studyPlanCardTemplate no encontrado');
            return null;
        }

        const cardElement = template.content.cloneNode(true);
        const card = cardElement.querySelector('.study-plan-card');

        // Establecer el ID del plan
        if (card) {
            card.setAttribute('data-plan-id', plan.id);
        }

        // Datos básicos
        const title = cardElement.querySelector('.plan-title');
        const description = cardElement.querySelector('.plan-description');
        const startDate = cardElement.querySelector('.start-date');
        const endDate = cardElement.querySelector('.end-date');
        const tasksCount = cardElement.querySelector('.tasks-count');
        const completedTasks = cardElement.querySelector('.completed-tasks');
        const progressPercentage = cardElement.querySelector('.progress-percentage');
        const progressBarFill = cardElement.querySelector('.progress-bar-fill');

        if (title) title.textContent = plan.title;
        if (description) description.textContent = plan.description || 'Sin descripción';
        if (startDate) startDate.textContent = this.formatDate(plan.start_date);
        if (endDate) endDate.textContent = this.formatDate(plan.end_date);

        // Estadísticas de tareas
        const totalTasks = plan.plan_tasks ? plan.plan_tasks.length : 0;
        const completed = plan.plan_tasks ? plan.plan_tasks.filter(task => task.completed).length : 0;
        const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        if (tasksCount) tasksCount.textContent = totalTasks;
        if (completedTasks) completedTasks.textContent = completed;
        if (progressPercentage) progressPercentage.textContent = `${progress}%`;
        if (progressBarFill) progressBarFill.style.width = `${progress}%`;

        // Event listeners
        const viewBtn = cardElement.querySelector('.action-btn.view-plan');
        const statusSelect = cardElement.querySelector('.status-select');
        const closeBtn = cardElement.querySelector('.close-expanded-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const planId = card.getAttribute('data-plan-id');
                if (planId) {
                    // Abrir vista expandida en la tarjeta en lugar del modal
                    this.expandCard(card, plan);
                }
            });
        }

        if (statusSelect) {
            statusSelect.value = plan.status || 'active';
            statusSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const newStatus = e.target.value;
                this.setPlanStatus(plan.id, newStatus);

                // Aplicar clase de color según el estado seleccionado
                statusSelect.classList.remove('completed', 'active', 'paused');
                statusSelect.classList.add(newStatus);
            });
            // Inicializar la clase de color al crear la tarjeta
            statusSelect.classList.remove('completed', 'active', 'paused');
            statusSelect.classList.add(statusSelect.value);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapseCard(card);
            });
        }

        // Configurar tabs y vista expandida usando el elemento real de la tarjeta
        this.setupExpandedTabs(card, plan);
        this.populateExpandedView(card, plan);

        return cardElement;
    }

    expandCard(cardElement, plan) {
        if (!cardElement || !plan) {
            console.error('Faltan parámetros para expandir la tarjeta');
            return;
        }

        // Cerrar cualquier otra tarjeta expandida
        const expandedCards = document.querySelectorAll('.study-plan-card.expanded');
        expandedCards.forEach(expandedCard => {
            if (expandedCard !== cardElement) {
                this.collapseCard(expandedCard);
            }
        });

        // Mostrar el botón de cerrar
        const closeBtn = cardElement.querySelector('.close-expanded-btn');
        if (closeBtn) {
            closeBtn.style.display = 'block';
        }

        // Mostrar la vista expandida y ocultar la normal
        const normalView = cardElement.querySelector('.normal-view');
        const expandedView = cardElement.querySelector('.expanded-view');

        if (normalView) normalView.style.display = 'none';
        if (expandedView) expandedView.style.display = 'block';

        // Expandir la tarjeta actual
        cardElement.classList.add('pre-expand');

        setTimeout(() => {
            cardElement.classList.remove('pre-expand');
            cardElement.classList.add('expanded');

            // Scroll suave hacia la tarjeta expandida
            cardElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });

            // Actualizar datos de la vista expandida
            this.populateExpandedView(cardElement, plan);

            // Activar pestaña persistida o la primera por defecto
            const persistedTab = this.getPersistedTab(plan.id) || 'overview';
            const targetBtn = cardElement.querySelector(`.tab-btn[data-tab="${persistedTab}"]`) || cardElement.querySelector('.tab-btn');
            const targetPanel = cardElement.querySelector(`.tab-panel[data-panel="${persistedTab}"]`) || cardElement.querySelector('.tab-panel');
            if (targetBtn && targetPanel) {
                targetBtn.classList.add('active');
                targetPanel.classList.add('active');
                this.loadTabContent(cardElement, plan, targetBtn.getAttribute('data-tab'));
            }
        }, 100);
    }

    collapseCard(cardElement) {
        if (!cardElement) {
            console.error('No se proporcionó un elemento de tarjeta para colapsar');
            return;
        }

        // Ocultar el botón de cerrar
        const closeBtn = cardElement.querySelector('.close-expanded-btn');
        if (closeBtn) {
            closeBtn.style.display = 'none';
        }

        // Mostrar la vista normal y ocultar la expandida
        const normalView = cardElement.querySelector('.normal-view');
        const expandedView = cardElement.querySelector('.expanded-view');

        if (normalView) normalView.style.display = 'block';
        if (expandedView) expandedView.style.display = 'none';

        // Aplicar animación de colapso
        cardElement.classList.add('collapsing');

        setTimeout(() => {
            cardElement.classList.remove('expanded', 'collapsing');
        }, 300);
    }

    calculateProgress(plan) {
        if (!plan.plan_tasks || plan.plan_tasks.length === 0) return 0;
        const completed = plan.plan_tasks.filter(task => task.completed).length;
        return Math.round((completed / plan.plan_tasks.length) * 100);
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'Activo',
            'paused': 'Pausado',
            'completed': 'Completado',
            'inactive': 'Inactivo'
        };
        return statusMap[status] || status;
    }

    filterPlans(searchTerm) {
        const filteredPlans = this.studyPlans.filter(plan =>
            plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plan.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredPlans(filteredPlans);
    }

    resetAllFilters() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const sortBy = document.getElementById('sortBy');
        const priorityFilter = document.getElementById('priorityFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (sortBy) sortBy.value = 'created_desc';
        if (priorityFilter) priorityFilter.value = '';

        this.renderStudyPlans();
    }

    applyFilters() {
        let filteredPlans = [...this.studyPlans];

        const searchTerm = document.getElementById('searchInput')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const sortBy = document.getElementById('sortBy')?.value || 'created_desc';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        if (searchTerm) {
            filteredPlans = filteredPlans.filter(plan =>
                plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                plan.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter) {
            filteredPlans = filteredPlans.filter(plan => plan.status === statusFilter);
        }

        if (priorityFilter) {
            filteredPlans = filteredPlans.filter(plan => plan.priority === priorityFilter);
        }

        // Ordenar
        filteredPlans.sort((a, b) => {
            switch (sortBy) {
                case 'title_asc': return a.title.localeCompare(b.title);
                case 'title_desc': return b.title.localeCompare(a.title);
                case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
                case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
                default: return 0;
            }
        });

        this.renderFilteredPlans(filteredPlans);
    }

    renderFilteredPlans(plans) {
        const grid = document.getElementById('studyPlansGrid');
        if (grid) {
            grid.innerHTML = ''; // Limpiar el grid

            // Crear y agregar cada tarjeta individualmente
            plans.forEach(plan => {
                const cardElement = this.createPlanCard(plan);
                if (cardElement) {
                    grid.appendChild(cardElement);
                }
            });
        }
    }

    openCreateModal() {
        this.currentEditingPlan = null;
        this.resetForm();

        const modal = document.getElementById('studyPlanModal');
        const modalTitle = document.getElementById('modalTitle');
        const saveBtn = document.getElementById('saveBtn');

        if (modalTitle) modalTitle.textContent = 'Crear Nuevo Plan de Estudio';
        if (saveBtn) saveBtn.textContent = 'Crear Plan';

        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }

        const titleInput = document.getElementById('title');
        if (titleInput) titleInput.focus();
    }

    async editPlan(planId) {
        const plan = this.studyPlans.find(p => p.id === planId);
        if (!plan) return;

        this.currentEditingPlan = plan;
        this.populateForm(plan);

        const modal = document.getElementById('studyPlanModal');
        const modalTitle = document.getElementById('modalTitle');
        const saveBtn = document.getElementById('saveBtn');

        if (modalTitle) modalTitle.textContent = 'Editar Plan de Estudio';
        if (saveBtn) saveBtn.textContent = 'Actualizar Plan';

        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
    }

    populateForm(plan) {
        const titleInput = document.getElementById('title');
        const descriptionInput = document.getElementById('description');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const statusSelect = document.getElementById('status');
        const prioritySelect = document.getElementById('priority');

        if (titleInput) titleInput.value = plan.title || '';
        if (descriptionInput) descriptionInput.value = plan.description || '';
        if (startDateInput) startDateInput.value = plan.start_date || '';
        if (endDateInput) endDateInput.value = plan.end_date || '';
        if (statusSelect) statusSelect.value = plan.status || 'active';
        if (prioritySelect) prioritySelect.value = plan.priority || 'medium';

        // Cargar tareas existentes
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer && plan.plan_tasks) {
            tasksContainer.innerHTML = '';
            plan.plan_tasks.forEach(task => {
                this.addTaskToForm(task);
            });
        }
    }

    resetForm() {
        const form = document.getElementById('studyPlanForm');
        if (form) form.reset();

        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) tasksContainer.innerHTML = '';

        this.addTaskToForm();
    }

    addTaskToForm(taskData = null) {
        const tasksContainer = document.getElementById('tasksContainer');
        if (!tasksContainer) return;

        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-input-group';
        taskDiv.innerHTML = `
            <div class="form-group">
                <input type="text" class="input-white task-title" placeholder="Título de la tarea" 
                       value="${taskData?.title || ''}" required>
            </div>
            <div class="form-group">
                <textarea class="input-white task-description" placeholder="Descripción de la tarea" 
                          rows="2">${taskData?.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group col-md-6">
                    <select class="combo-white task-priority">
                        <option value="low" ${taskData?.priority === 'low' ? 'selected' : ''}>Baja</option>
                        <option value="medium" ${taskData?.priority === 'medium' || !taskData ? 'selected' : ''}>Media</option>
                        <option value="high" ${taskData?.priority === 'high' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
                <div class="form-group col-md-6">
                    <button type="button" class="btn btn-danger btn-sm remove-task">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;

        const removeBtn = taskDiv.querySelector('.remove-task');
        removeBtn.addEventListener('click', () => taskDiv.remove());

        tasksContainer.appendChild(taskDiv);
    }

    validateDates() {
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        if (startDate && endDate && startDate.value && endDate.value) {
            const start = new Date(startDate.value);
            const end = new Date(endDate.value);

            if (end <= start) {
                endDate.setCustomValidity('La fecha de fin debe ser posterior a la fecha de inicio');
                return false;
            } else {
                endDate.setCustomValidity('');
                return true;
            }
        }
        return true;
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        if (!this.validateDates()) {
            this.showError('Por favor, corrige las fechas del plan');
            return;
        }

        const planData = this.getFormData();
        const isEdit = !!this.currentEditingPlan;
        const planId = this.currentEditingPlan?.id;

        await this.createOrUpdatePlan(planData, isEdit, planId);
    }

    async createOrUpdatePlan(planData, isEdit = false, planId = null) {
        try {
            this.setFormLoading(true);

            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const url = isEdit ? `${base}/api/study/plans/${planId}` : `${base}/api/study/plans`;
            const method = isEdit ? 'PUT' : 'POST';
            const token = this.getAuthToken();

            // Forzar estado activo en creación por lógica de negocio
            if (!isEdit) {
                planData.status = 'active';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(planData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess(isEdit ? 'Plan actualizado correctamente' : 'Plan creado correctamente');
                this.closeModal();
                await this.loadStudyPlans();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error al procesar la solicitud');
            }

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al guardar el plan');
        } finally {
            this.setFormLoading(false);
        }
    }

    getFormData() {
        const title = document.getElementById('title')?.value;
        const description = document.getElementById('description')?.value;
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const status = document.getElementById('status')?.value;
        const priority = document.getElementById('priority')?.value;

        // Recopilar tareas
        const taskInputs = document.querySelectorAll('.task-input-group');
        const tasks = Array.from(taskInputs).map(taskDiv => {
            const title = taskDiv.querySelector('.task-title')?.value;
            const description = taskDiv.querySelector('.task-description')?.value;
            const priority = taskDiv.querySelector('.task-priority')?.value;

            if (title) {
                return {
                    title,
                    description: description || '',
                    priority: priority || 'medium',
                    completed: false
                };
            }
            return null;
        }).filter(task => task !== null);

        return {
            title,
            description: description || '',
            start_date: startDate,
            end_date: endDate,
            status: status || 'active',
            priority: priority || 'medium',
            tasks: tasks
        };
    }

    async viewPlanDetails(planId) {
        const plan = this.studyPlans.find(p => p.id === planId);
        if (!plan) return;

        this.currentEditingPlan = plan;
        this.populateDetailsModal(plan);

        const modal = document.getElementById('planDetailsModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
    }

    populateDetailsModal(plan) {
        const title = document.getElementById('detailTitle');
        const description = document.getElementById('detailDescription');
        const dates = document.getElementById('detailDates');
        const status = document.getElementById('detailStatus');
        const priority = document.getElementById('detailPriority');
        const progress = document.getElementById('detailProgress');
        const tasksList = document.getElementById('detailTasksList');

        if (title) title.textContent = plan.title;
        if (description) description.textContent = plan.description || 'Sin descripción';
        if (dates) dates.textContent = `${this.formatDate(plan.start_date)} - ${this.formatDate(plan.end_date)}`;
        if (status) {
            status.textContent = this.getStatusText(plan.status);
            status.className = `status-badge ${plan.status}`;
        }
        if (priority) {
            priority.textContent = this.getPriorityText(plan.priority);
            priority.className = `priority-badge ${plan.priority}`;
        }
        if (progress) {
            const progressValue = this.calculateProgress(plan);
            progress.textContent = `${progressValue}%`;
        }

        if (tasksList) {
            this.populateTasksList(plan.plan_tasks || []);
        }
    }

    populateTasksList(tasks) {
        const tasksList = document.getElementById('detailTasksList');
        if (!tasksList) return;

        if (tasks.length === 0) {
            tasksList.innerHTML = '<p class="no-tasks">No hay tareas asignadas a este plan</p>';
            return;
        }

        tasksList.innerHTML = tasks.map(task => this.createTaskDetailElement(task).outerHTML).join('');
    }

    createTaskDetailElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-detail-item';
        taskDiv.innerHTML = `
            <div class="task-header">
                <h5 class="task-title">${task.title}</h5>
                <span class="task-priority-badge ${task.priority}">${this.getPriorityText(task.priority)}</span>
            </div>
            <p class="task-description">${task.description || 'Sin descripción'}</p>
            <div class="task-footer">
                <span class="task-status ${task.completed ? 'completed' : 'pending'}">
                    ${task.completed ? '✅ Completada' : '⏳ Pendiente'}
                </span>
                <div class="task-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="studyPlansManager.editTask('${task.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm ${task.completed ? 'btn-warning' : 'btn-success'}" 
                            onclick="studyPlansManager.toggleTaskCompletion('${task.id}')">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        ${task.completed ? 'Desmarcar' : 'Completar'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="studyPlansManager.deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        return taskDiv;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja'
        };
        return priorityMap[priority] || priority;
    }

    async togglePlanStatus(planId) {
        try {
            const plan = (this.studyPlans || []).find(p => p.id === planId);
            const currentStatus = plan?.status || 'active';
            const nextStatus = currentStatus === 'active' ? 'paused' : 'active';

            const token = this.getAuthToken();
            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const response = await fetch(`${base}/api/study/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status: nextStatus })
            });

            if (response.ok) {
                this.showSuccess(`Estado del plan actualizado a ${this.getStatusText(nextStatus)}`);
                await this.loadStudyPlans();
            } else {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || err.message || 'Error al actualizar estado del plan');
            }
        } catch (error) {
            console.error('Error togglePlanStatus:', error);
            this.showError('No se pudo actualizar el estado del plan');
        }
    }

    async setPlanStatus(planId, status) {
        try {
            const token = this.getAuthToken();
            const base = this.getBaseUrl();
            const response = await fetch(`${base}/api/study/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showSuccess(`Estado del plan actualizado a ${this.getStatusText(status)}`);
                await this.loadStudyPlans();
            } else {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || err.message || 'Error al actualizar estado del plan');
            }
        } catch (error) {
            console.error('Error setPlanStatus:', error);
            this.showError('No se pudo actualizar el estado del plan');
        }
    }

    async toggleTaskCompletion(taskId, completed) {
        try {
            // Determinar estado actual si no se proporcionó
            let currentCompleted = completed;
            if (typeof currentCompleted === 'undefined') {
                for (const p of (this.studyPlans || [])) {
                    const t = (p.plan_tasks || []).find(x => String(x.id) === String(taskId));
                    if (t) {
                        currentCompleted = !!t.completed;
                        break;
                    }
                }
            }
            const taskBtn = document.querySelector(`.task-item[data-task-id="${taskId}"] .btn-toggle-task`);
            if (taskBtn) this.setButtonLoading(taskBtn, true, currentCompleted ? 'Desmarcando...' : 'Completando...');

            const token = this.getAuthToken();
            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const response = await fetch(`${base}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ completed: !currentCompleted })
            });

            if (response.ok) {
                await this.loadStudyPlans();
                this.showSuccess('Tarea actualizada correctamente');
            } else {
                throw new Error('Error al actualizar la tarea');
            }
        } catch (error) {
            console.error('Error actualizando tarea:', error);
            this.showError('Error al actualizar la tarea');
        } finally {
            const taskBtn = document.querySelector(`.task-item[data-task-id="${taskId}"] .btn-toggle-task`);
            if (taskBtn) this.setButtonLoading(taskBtn, false);
        }
    }

    async deletePlan(planId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este plan de estudio? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const token = this.getAuthToken();
            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const response = await fetch(`${base}/api/study/plans/${planId}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                this.showSuccess('Plan eliminado correctamente');
                await this.loadStudyPlans();
            } else {
                throw new Error('Error al eliminar el plan');
            }
        } catch (error) {
            console.error('Error eliminando plan:', error);
            this.showError('Error al eliminar el plan');
        }
    }

    editCurrentPlan() {
        if (this.currentEditingPlan) {
            this.closeDetailsModal();
            this.editPlan(this.currentEditingPlan.id);
        }
    }

    async deleteCurrentPlan() {
        if (this.currentEditingPlan) {
            await this.deletePlan(this.currentEditingPlan.id);
            this.closeDetailsModal();
        }
    }

    async editTask(taskId) {
        console.log('Editar tarea:', taskId);
        this.editCurrentPlan();
    }

    async deleteTask(taskId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }

        try {
            const deleteBtn = document.querySelector(`.task-item[data-task-id="${taskId}"] .btn-delete-task`);
            if (deleteBtn) this.setButtonLoading(deleteBtn, true, 'Eliminando...');
            const token = this.getAuthToken();
            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const response = await fetch(`${base}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                this.showSuccess('Tarea eliminada correctamente');
                await this.loadStudyPlans();

                if (this.currentEditingPlan) {
                    this.populateDetailsModal(this.currentEditingPlan);
                }
            } else {
                throw new Error('Error al eliminar la tarea');
            }
        } catch (error) {
            console.error('Error eliminando tarea:', error);
            this.showError('Error al eliminar la tarea');
        } finally {
            const deleteBtn = document.querySelector(`.task-item[data-task-id="${taskId}"] .btn-delete-task`);
            if (deleteBtn) this.setButtonLoading(deleteBtn, false);
        }
    }

    closeModal() {
        const modal = document.getElementById('studyPlanModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        this.currentEditingPlan = null;
        this.resetForm();
    }

    closeDetailsModal() {
        const modal = document.getElementById('planDetailsModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        this.currentEditingPlan = null;
    }

    setFormLoading(loading) {
        const saveBtn = document.getElementById('saveBtn');
        const saveBtnText = document.getElementById('saveBtnText');
        const spinner = saveBtn?.querySelector('.btn-spinner');

        if (saveBtn) saveBtn.disabled = loading;
        if (saveBtnText) saveBtnText.style.display = loading ? 'none' : 'inline';
        if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    }

    // Estado de carga para botones individuales
    setButtonLoading(buttonEl, loading, loadingText = 'Procesando...') {
        if (!buttonEl) return;
        if (loading) {
            buttonEl.dataset.originalText = buttonEl.textContent || '';
            buttonEl.textContent = loadingText;
            buttonEl.classList.add('btn-loading');
            buttonEl.disabled = true;
        } else {
            const original = buttonEl.dataset.originalText || '';
            if (original) buttonEl.textContent = original;
            buttonEl.classList.remove('btn-loading');
            buttonEl.disabled = false;
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');

        if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
        if (show) {
            if (grid) grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        }
    }

    showError(message) {
        if (typeof window.showError === 'function') {
            window.showError(message);
        } else {
            console.error('Error:', message);

            const notification = document.createElement('div');
            notification.className = 'error-notification-planes';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4757;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
                z-index: 10000;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                animation: slideInRight 0.3s ease-out;
            `;

            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>❌</span>
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; cursor: pointer; margin-left: auto; font-size: 16px;">×</button>
                </div>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    showSuccess(message) {
        if (typeof window.showSuccess === 'function') {
            window.showSuccess(message);
        } else {
            console.log('Success:', message);

            const notification = document.createElement('div');
            notification.className = 'success-notification-planes';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2ed573;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(46, 213, 115, 0.3);
                z-index: 10000;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                animation: slideInRight 0.3s ease-out;
            `;

            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>✅</span>
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; cursor: pointer; margin-left: auto; font-size: 16px;">×</button>
                </div>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }
    }

    openContentManager(planId) {
        console.log('Abriendo gestor de contenido para plan:', planId);

        if (typeof openPlanContentModal === 'function') {
            openPlanContentModal(planId);
        } else {
            console.error('Plan Content Manager no está disponible');
            this.showError('Error: Gestor de contenido no disponible');
        }
    }

    showNotification(type, message) {
        if (typeof showNotification === 'function') {
            showNotification(type, message, type === 'error' ? '❌' : '✅');
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Formularios inline para crear tareas y contenido en la vista expandida
    openAddTaskForm(cardElement, plan) {
        const tasksContainer = cardElement.querySelector('.tasks-list-expanded') || cardElement.querySelector('.tasks-list');
        if (!tasksContainer) return;

        const form = document.createElement('div');
        form.className = 'task-form-inline';
        form.innerHTML = `
            <div class="form-grid">
                <div class="form-field">
                    <label>Título</label>
                    <input type="text" id="newTaskTitle" placeholder="Ej. Repasar capítulo 3" />
                </div>
                <div class="form-field">
                    <label>Descripción</label>
                    <textarea id="newTaskDescription" placeholder="Detalles opcionales"></textarea>
                </div>
                <div class="form-field">
                    <label>Fecha límite</label>
                    <input type="date" id="newTaskDueDate" />
                </div>
                <div class="form-field">
                    <label>Prioridad</label>
                    <select id="newTaskPriority">
                        <option value="low">Baja</option>
                        <option value="medium" selected>Media</option>
                        <option value="high">Alta</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn primary" id="saveNewTaskBtn">Guardar</button>
                <button class="btn secondary" id="cancelNewTaskBtn">Cancelar</button>
            </div>
        `;

        tasksContainer.prepend(form);

        form.querySelector('#cancelNewTaskBtn').onclick = () => form.remove();
        form.querySelector('#saveNewTaskBtn').onclick = () => this.saveNewTask(cardElement, plan, form);
    }

    async saveNewTask(cardElement, plan, form) {
        const title = form.querySelector('#newTaskTitle')?.value?.trim();
        const description = form.querySelector('#newTaskDescription')?.value?.trim();
        const dueDate = form.querySelector('#newTaskDueDate')?.value || null;
        const priority = form.querySelector('#newTaskPriority')?.value || 'medium';

        if (!title) {
            this.showError('El título de la tarea es requerido.');
            return;
        }

        try {
            const saveBtn = form.querySelector('#saveNewTaskBtn');
            if (saveBtn) this.setButtonLoading(saveBtn, true, 'Guardando...');
            const token = this.getAuthToken();
            const base = (window.CONFIG && window.CONFIG.API && window.CONFIG.API.BASE_URL) ? window.CONFIG.API.BASE_URL : '';
            const res = await fetch(`${base}/api/study/plans/${plan.id}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ title, description, dueDate, priority })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'No se pudo crear la tarea');
            }

            const newTask = data?.task;
            if (newTask) {
                const tasks = plan.plan_tasks || plan.tasks || [];
                tasks.unshift(newTask);
                plan.plan_tasks = tasks;
            }

            form.remove();
            this.loadTasksTab(cardElement, plan);
            this.showSuccess('Tarea creada correctamente');
        } catch (error) {
            console.error('Error creando tarea:', error);
            this.showError(error.message || 'Error al crear la tarea');
        } finally {
            const saveBtn = form.querySelector('#saveNewTaskBtn');
            if (saveBtn) this.setButtonLoading(saveBtn, false);
        }
    }

    // El flujo de agregar contenido manual fue retirado.
    // Abrimos directamente el selector desde historial para una UX más simple.
    openAddContentForm(cardElement, plan) {
        this.openHistoryPicker(cardElement, plan);
    }

    // Guardado manual de contenido retirado; el agregado se realiza desde historial.
}

// Instancia global como singleton
window.studyPlansManager = window.studyPlansManager || null;

function initializeStudyPlans() {
    if (!window.studyPlansManager) {
        window.studyPlansManager = new window.StudyPlansManager();
    } else if (window.studyPlansManager && typeof window.studyPlansManager.init === 'function') {
        window.studyPlansManager.init();
    }
}

function cleanupStudyPlans() {
    try {
        // Desacoplar listeners de controles comunes clonando nodos
        const ids = ['searchInput','sortBy','typeFilter','priorityFilter','resetFilters','gridView','listView','prevPage','nextPage'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentNode) {
                const clone = el.cloneNode(true);
                el.parentNode.replaceChild(clone, el);
            }
        });
        // Botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn && btn.parentNode) {
                const clone = btn.cloneNode(true);
                btn.parentNode.replaceChild(clone, btn);
            }
        });
    } catch (_) {}
    // Resetear singleton para permitir nueva inicialización
    window.studyPlansManager = null;
}

if (typeof window !== 'undefined') {
    window.initializeStudyPlans = initializeStudyPlans;
    window.cleanupStudyPlans = cleanupStudyPlans;
}

// Inicialización automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('planes-estudio')) {
            initializeStudyPlans();
        }
    });
} else {
    if (window.location.pathname.includes('planes-estudio')) {
        if (!window.app) {
            initializeStudyPlans();
        }
    }
}