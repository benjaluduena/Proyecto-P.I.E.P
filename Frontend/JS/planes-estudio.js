// Planes de Estudio - Lógica principal
class StudyPlansManager {
    constructor() {
        this.currentUser = null;
        this.studyPlans = [];
        this.currentEditingPlan = null;
        this.isLoading = false;
        this.authModule = null;
        this.apiModule = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('Inicializando planes de estudio...');
            
            // Configurar usuario de desarrollo
            this.currentUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'dev@localhost' };
            
            this.setupEventListeners();
            await this.loadStudyPlans();
        } catch (error) {
            console.error('Error inicializando planes de estudio:', error);
            this.showError('Error al cargar la aplicación');
        }
    }

    // Esperar a que la aplicación esté inicializada
    async waitForApp() {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        while (attempts < maxAttempts) {
            if (window.app && window.app.authModule && window.app.isInitialized) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('La aplicación no se inicializó correctamente');
    }

    getCurrentUser() {
        try {
            return this.authModule?.getCurrentUser() || null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }

    setupEventListeners() {
        // Botón crear plan
        const createBtn = document.getElementById('createPlanBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateModal());
        }

        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterPlans(e.target.value));
        }

        // Filtros
        const statusFilter = document.getElementById('statusFilter');
        const sortBy = document.getElementById('sortBy');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (sortBy) {
            sortBy.addEventListener('change', () => this.applyFilters());
        }

        // Modal eventos
        this.setupModalEvents();
        
        // Formulario de plan
        this.setupFormEvents();
    }

    setupModalEvents() {
        // Modal crear/editar plan
        const modal = document.getElementById('studyPlanModal');
        const closeBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
        
        // Modal detalles
        const detailsModal = document.getElementById('planDetailsModal');
        const closeDetailsBtn = document.getElementById('closeDetailsModal');
        const closeDetailsBtn2 = document.getElementById('closeDetailsBtn');
        const editPlanBtn = document.getElementById('editPlanBtn');
        const deletePlanBtn = document.getElementById('deletePlanBtn');
        
        if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => this.closeDetailsModal());
        if (closeDetailsBtn2) closeDetailsBtn2.addEventListener('click', () => this.closeDetailsModal());
        if (editPlanBtn) editPlanBtn.addEventListener('click', () => this.editCurrentPlan());
        if (deletePlanBtn) deletePlanBtn.addEventListener('click', () => this.deleteCurrentPlan());
        
        // Botones del modal de detalles
        const closeDetailsBtn3 = document.getElementById('closeDetailsBtn');
        if (closeDetailsBtn3) {
            closeDetailsBtn3.addEventListener('click', () => this.closeDetailsModal());
        }
        
        const closeDetailsModal = document.getElementById('closeDetailsModal');
        if (closeDetailsModal) {
            closeDetailsModal.addEventListener('click', () => this.closeDetailsModal());
        }
        
        const editPlanBtn2 = document.getElementById('editPlanBtn');
        if (editPlanBtn2) {
            editPlanBtn2.addEventListener('click', () => this.editCurrentPlan());
        }
        
        const deletePlanBtn2 = document.getElementById('deletePlanBtn');
        if (deletePlanBtn2) {
            deletePlanBtn2.addEventListener('click', () => this.deleteCurrentPlan());
        }

        // Cerrar modal al hacer clic fuera
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        
        if (detailsModal) {
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) this.closeDetailsModal();
            });
        }
    }

    setupFormEvents() {
        // Formulario principal
        const form = document.getElementById('studyPlanForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Botón agregar tarea
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.addTaskToForm());
        }

        // Validación de fechas
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.validateDates());
            endDate.addEventListener('change', () => this.validateDates());
        }
    }

    async loadStudyPlans() {
        try {
            console.log('Cargando planes de estudio...');
            this.showLoading(true);
            
            // Hacer petición directa al backend
            const response = await fetch('http://localhost:5500/api/study/plans', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Respuesta de la API:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            this.studyPlans = data.plans || data || [];
            console.log('Planes cargados:', this.studyPlans.length);
            
            this.renderStudyPlans();
        } catch (error) {
            console.error('Error cargando planes:', error);
            this.showError('Error al cargar los planes de estudio: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    getAuthToken() {
        try {
            return this.authModule?.getAccessToken() || '';
        } catch (error) {
            console.error('Error obteniendo token:', error);
            return '';
        }
    }

    showEmptyState(message) {
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');
        const emptyMessage = document.getElementById('emptyMessage');
        
        if (grid) grid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            if (emptyMessage) {
                emptyMessage.textContent = message;
            }
        }
    }

    renderStudyPlans() {
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!grid) return;

        if (this.studyPlans.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = '';
        
        this.studyPlans.forEach(plan => {
            const card = this.createPlanCard(plan);
            grid.appendChild(card);
        });
    }

    createPlanCard(plan) {
        const template = document.getElementById('studyPlanCardTemplate');
        if (!template) return document.createElement('div');

        const card = template.content.cloneNode(true);
        const cardElement = card.querySelector('.study-plan-card');
        
        // Configurar datos
        cardElement.dataset.planId = plan.id;
        
        // Título
        const title = card.querySelector('.plan-title');
        if (title) title.textContent = plan.title;
        
        // Descripción
        const description = card.querySelector('.plan-description');
        if (description) {
            description.textContent = plan.description || 'Sin descripción';
        }
        
        // Fechas
        const dates = card.querySelector('.plan-dates');
        if (dates) {
            const startDate = new Date(plan.start_date).toLocaleDateString();
            const endDate = new Date(plan.end_date).toLocaleDateString();
            dates.textContent = `${startDate} - ${endDate}`;
        }
        
        // Contador de tareas
        const tasksCount = card.querySelector('.plan-tasks-count');
        if (tasksCount) {
            const totalTasks = plan.plan_tasks?.length || 0;
            const completedTasks = plan.plan_tasks?.filter(t => t.completed).length || 0;
            tasksCount.textContent = `${completedTasks}/${totalTasks} tareas`;
        }
        

        
        // Estado
        const statusBadge = card.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.textContent = this.getStatusText(plan.status);
            statusBadge.dataset.status = plan.status;
        }
        
        // Eventos de botones
        const viewBtn = card.querySelector('.view-plan');
        const editBtn = card.querySelector('.edit-plan');
        const deleteBtn = card.querySelector('.delete-plan');
        
        if (viewBtn) viewBtn.addEventListener('click', () => this.viewPlanDetails(plan.id));
        if (editBtn) editBtn.addEventListener('click', () => this.editPlan(plan.id));
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deletePlan(plan.id));
        
        return cardElement;
    }

    calculateProgress(plan) {
        if (!plan.plan_tasks || plan.plan_tasks.length === 0) return 0;
        
        const completedTasks = plan.plan_tasks.filter(task => task.completed).length;
        return Math.round((completedTasks / plan.plan_tasks.length) * 100);
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'Activo',
            'completed': 'Completado',
            'paused': 'Pausado'
        };
        return statusMap[status] || status;
    }

    filterPlans(searchTerm) {
        const filteredPlans = this.studyPlans.filter(plan => 
            plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredPlans(filteredPlans);
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const sortBy = document.getElementById('sortBy')?.value || 'created_at';
        const searchTerm = document.getElementById('searchPlans')?.value || '';
        
        let filteredPlans = [...this.studyPlans];
        
        // Filtrar por estado
        if (statusFilter !== 'all') {
            filteredPlans = filteredPlans.filter(plan => plan.status === statusFilter);
        }
        
        // Filtrar por búsqueda
        if (searchTerm) {
            filteredPlans = filteredPlans.filter(plan => 
                plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // Ordenar
        filteredPlans.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'progress':
                    return this.calculateProgress(b) - this.calculateProgress(a);
                case 'created_at':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        this.renderFilteredPlans(filteredPlans);
    }

    renderFilteredPlans(plans) {
        const originalPlans = this.studyPlans;
        this.studyPlans = plans;
        this.renderStudyPlans();
        this.studyPlans = originalPlans;
    }

    openCreateModal() {
        this.currentEditingPlan = null;
        this.resetForm();
        
        const modal = document.getElementById('studyPlanModal');
        const modalTitle = document.getElementById('modalTitle');
        const saveBtnText = document.getElementById('saveBtnText');
        
        if (modalTitle) modalTitle.textContent = 'Crear Nuevo Plan de Estudio';
        if (saveBtnText) saveBtnText.textContent = 'Crear Plan';
        
        // Establecer fecha mínima como hoy
        const startDate = document.getElementById('startDate');
        if (startDate) {
            startDate.min = new Date().toISOString().split('T')[0];
            startDate.value = new Date().toISOString().split('T')[0];
        }
        
        this.addTaskToForm(); // Agregar una tarea inicial
        
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    }

    async editPlan(planId) {
        const plan = this.studyPlans.find(p => p.id === planId);
        if (!plan) return;
        
        this.currentEditingPlan = plan;
        this.populateForm(plan);
        
        const modal = document.getElementById('studyPlanModal');
        const modalTitle = document.getElementById('modalTitle');
        const saveBtnText = document.getElementById('saveBtnText');
        
        if (modalTitle) modalTitle.textContent = 'Editar Plan de Estudio';
        if (saveBtnText) saveBtnText.textContent = 'Guardar Cambios';
        
        if (modal) modal.style.display = 'flex';
    }

    populateForm(plan) {
        // Datos básicos
        const titleInput = document.getElementById('planTitle');
        const descriptionInput = document.getElementById('planDescription');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const statusInput = document.getElementById('planStatus');
        
        if (titleInput) titleInput.value = plan.title || '';
        if (descriptionInput) descriptionInput.value = plan.description || '';
        if (startDateInput) startDateInput.value = plan.start_date?.split('T')[0] || '';
        if (endDateInput) endDateInput.value = plan.end_date?.split('T')[0] || '';
        if (statusInput) statusInput.value = plan.status || 'active';
        
        // Limpiar tareas existentes
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) {
            tasksContainer.innerHTML = '';
        }
        
        // Agregar tareas existentes
        if (plan.tasks && plan.tasks.length > 0) {
            plan.tasks.forEach(task => {
                this.addTaskToForm(task);
            });
        } else {
            this.addTaskToForm(); // Agregar una tarea vacía
        }
    }

    resetForm() {
        const form = document.getElementById('studyPlanForm');
        if (form) form.reset();
        
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) {
            tasksContainer.innerHTML = '';
        }
    }

    addTaskToForm(taskData = null) {
        const template = document.getElementById('taskFormTemplate');
        const container = document.getElementById('tasksContainer');
        
        if (!template || !container) return;
        
        const taskElement = template.content.cloneNode(true);
        const taskItem = taskElement.querySelector('.task-item');
        
        // Rellenar datos si se proporcionan
        if (taskData) {
            const titleInput = taskElement.querySelector('.task-title');
            const descriptionInput = taskElement.querySelector('.task-description');
            const dueDateInput = taskElement.querySelector('.task-due-date');
            const priorityInput = taskElement.querySelector('.task-priority');
            
            if (titleInput) titleInput.value = taskData.title || '';
            if (descriptionInput) descriptionInput.value = taskData.description || '';
            if (dueDateInput) dueDateInput.value = taskData.due_date?.split('T')[0] || '';
            if (priorityInput) priorityInput.value = taskData.priority || 'medium';
        }
        
        // Evento para eliminar tarea
        const removeBtn = taskElement.querySelector('.remove-task');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                taskItem.remove();
            });
        }
        
        container.appendChild(taskElement);
    }

    validateDates() {
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (!startDate || !endDate) return true;
        
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        
        if (start && end && start >= end) {
            endDate.setCustomValidity('La fecha de finalización debe ser posterior a la fecha de inicio');
            return false;
        } else {
            endDate.setCustomValidity('');
            return true;
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateDates()) {
            this.showError('Por favor corrige las fechas del plan');
            return;
        }
        
        const formData = this.getFormData();
        if (!formData) return;
        
        try {
            this.setFormLoading(true);
            
            const isEditing = !!this.currentEditingPlan;
            const url = isEditing ? 
                `http://localhost:5500/api/study/plans/${this.currentEditingPlan.id}` : 
                `http://localhost:5500/api/study/plans`;
            
            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            this.showSuccess(isEditing ? 'Plan actualizado correctamente' : 'Plan creado correctamente');
            this.closeModal();
            await this.loadStudyPlans();
            
        } catch (error) {
            console.error('Error guardando plan:', error);
            this.showError(error.message || 'Error al guardar el plan');
        } finally {
            this.setFormLoading(false);
        }
    }

    getFormData() {
        const title = document.getElementById('planTitle')?.value?.trim();
        const description = document.getElementById('planDescription')?.value?.trim();
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const status = document.getElementById('planStatus')?.value;
        
        if (!title || !startDate || !endDate) {
            this.showError('Por favor completa todos los campos obligatorios');
            return null;
        }
        
        // Recopilar tareas
        const tasks = [];
        const taskItems = document.querySelectorAll('#tasksContainer .task-item');
        
        taskItems.forEach(item => {
            const taskTitle = item.querySelector('.task-title')?.value?.trim();
            const taskDescription = item.querySelector('.task-description')?.value?.trim();
            const taskDueDate = item.querySelector('.task-due-date')?.value;
            const taskPriority = item.querySelector('.task-priority')?.value;
            
            if (taskTitle) {
                tasks.push({
                    title: taskTitle,
                    description: taskDescription || null,
                    due_date: taskDueDate || null,
                    priority: taskPriority || 'medium',
                    completed: false
                });
            }
        });
        
        return {
            title,
            description: description || null,
            start_date: startDate,
            end_date: endDate,
            status: status || 'active',
            tasks
        };
    }

    async viewPlanDetails(planId) {
        const plan = this.studyPlans.find(p => p.id === planId);
        if (!plan) return;
        
        this.currentEditingPlan = plan;
        this.populateDetailsModal(plan);
        
        const modal = document.getElementById('planDetailsModal');
        if (modal) modal.style.display = 'flex';
    }

    populateDetailsModal(plan) {
        // Título
        const title = document.getElementById('detailsTitle');
        if (title) title.textContent = plan.title;
        
        // Información básica
        const description = document.getElementById('detailsDescription');
        const status = document.getElementById('detailsStatus');
        const startDate = document.getElementById('detailsStartDate');
        const endDate = document.getElementById('detailsEndDate');
        
        if (description) description.textContent = plan.description || 'Sin descripción';
        if (status) {
            status.textContent = this.getStatusText(plan.status);
            status.dataset.status = plan.status;
        }
        if (startDate) startDate.textContent = new Date(plan.start_date).toLocaleDateString();
        if (endDate) endDate.textContent = new Date(plan.end_date).toLocaleDateString();
        
        // Progreso
        const progress = this.calculateProgress(plan);
        const progressFill = document.getElementById('detailsProgress');
        const progressText = document.getElementById('detailsProgressText');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
        
        // Lista de tareas
        this.populateTasksList(plan.tasks || []);
    }

    populateTasksList(tasks) {
        const tasksList = document.getElementById('detailsTasksList');
        if (!tasksList) return;
        
        tasksList.innerHTML = '';
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No hay tareas en este plan</p>';
            return;
        }
        
        tasks.forEach(task => {
            const taskElement = this.createTaskDetailElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    createTaskDetailElement(task) {
        const template = document.getElementById('taskDetailsTemplate');
        if (!template) {
            console.error('Template taskDetailsTemplate no encontrado');
            return document.createElement('div');
        }
        
        const taskElement = template.content.cloneNode(true);
        const container = taskElement.querySelector('.task-detail-item');
        
        // Configurar checkbox y título
        const checkbox = taskElement.querySelector('.task-completed');
        const label = taskElement.querySelector('.task-title');
        const uniqueId = `task-${task.id}-${Date.now()}`;
        
        checkbox.id = uniqueId;
        checkbox.checked = task.completed || false;
        checkbox.addEventListener('change', () => this.toggleTaskCompletion(task.id));
        
        label.setAttribute('for', uniqueId);
        label.textContent = task.title;
        
        // Configurar badge de prioridad
        const priorityBadge = taskElement.querySelector('.task-priority-badge');
        priorityBadge.textContent = this.getPriorityText(task.priority);
        priorityBadge.className = `task-priority-badge ${task.priority || 'medium'}`;
        
        // Configurar descripción
        const description = taskElement.querySelector('.task-description');
        description.textContent = task.description || 'Sin descripción disponible';
        
        // Configurar fecha límite
        const dueDate = taskElement.querySelector('.task-due-date');
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            dueDate.textContent = `📅 ${date.toLocaleDateString('es-ES')}`;
        } else {
            dueDate.textContent = '📅 Sin fecha límite';
        }
        
        // Configurar estado
        const status = taskElement.querySelector('.task-status');
        status.textContent = task.completed ? '✅ Completada' : '⏳ Pendiente';
        
        return container;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja'
        };
        return priorityMap[priority] || priority;
    }

    async toggleTaskCompletion(taskId, completed) {
        try {
            const response = await this.apiModule.put(`/api/tasks/${taskId}`, { completed });
            await this.apiModule.handleResponse(response);
            
            // Actualizar datos locales
            await this.loadStudyPlans();
            
            // Actualizar modal si está abierto
            if (this.currentEditingPlan) {
                const updatedPlan = this.studyPlans.find(p => p.id === this.currentEditingPlan.id);
                if (updatedPlan) {
                    this.populateDetailsModal(updatedPlan);
                }
            }
            
        } catch (error) {
            console.error('Error actualizando tarea:', error);
            this.showError('Error al actualizar la tarea');
        }
    }

    async deletePlan(planId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este plan de estudio? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:5500/api/study/plans/${planId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.showSuccess('Plan eliminado correctamente');
            await this.loadStudyPlans();
            
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
        // Implementar edición de tarea individual
        console.log('Editar tarea:', taskId);
        // Por ahora, redirigir a editar el plan completo
        this.editCurrentPlan();
    }

    async toggleTaskCompletion(taskId) {
        try {
            const response = await this.apiModule.patch(`/api/tasks/${taskId}/toggle`);
            const updatedTask = await this.apiModule.handleResponse(response);
            
            // Actualizar la tarea en el plan actual
            if (this.currentEditingPlan) {
                const task = this.currentEditingPlan.tasks.find(t => t.id === taskId);
                if (task) {
                    task.completed = updatedTask.completed;
                }
                
                // Recalcular progreso y actualizar vista
                this.updatePlanProgress(this.currentEditingPlan);
                this.populateDetailsModal(this.currentEditingPlan);
            }
            
            // Recargar planes para actualizar las tarjetas
            await this.loadStudyPlans();
            
        } catch (error) {
            console.error('Error actualizando tarea:', error);
            this.showError('Error al actualizar el estado de la tarea');
        }
    }
    
    updatePlanProgress(plan) {
        if (!plan.tasks || plan.tasks.length === 0) {
            plan.progress = 0;
            return;
        }
        
        const completedTasks = plan.tasks.filter(task => task.completed).length;
        plan.progress = Math.round((completedTasks / plan.tasks.length) * 100);
    }

    async deleteTask(taskId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }
        
        try {
            const response = await this.apiModule.delete(`/api/tasks/${taskId}`);
            await this.apiModule.handleResponse(response);
            
            this.showSuccess('Tarea eliminada correctamente');
            await this.loadStudyPlans();
            
            // Actualizar modal si está abierto
            if (this.currentEditingPlan) {
                const updatedPlan = this.studyPlans.find(p => p.id === this.currentEditingPlan.id);
                if (updatedPlan) {
                    this.populateDetailsModal(updatedPlan);
                }
            }
            
        } catch (error) {
            console.error('Error eliminando tarea:', error);
            this.showError('Error al eliminar la tarea');
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

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const grid = document.getElementById('studyPlansGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (loadingState) loadingState.style.display = show ? 'block' : 'none';
        if (show) {
            if (grid) grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        }
    }

    showError(message) {
        // Implementar sistema de notificaciones
        console.error(message);
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        // Implementar sistema de notificaciones
        console.log(message);
        alert(message);
    }
}

// Inicializar cuando se carga la sección
let studyPlansManager = null;

function initializeStudyPlans() {
    console.log('Inicializando StudyPlansManager...');
    if (!studyPlansManager) {
        studyPlansManager = new StudyPlansManager();
    }
    return studyPlansManager;
}

// Limpiar cuando se cambia de sección
function cleanupStudyPlans() {
    console.log('Limpiando StudyPlansManager...');
    studyPlansManager = null;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.initializeStudyPlans = initializeStudyPlans;
    window.cleanupStudyPlans = cleanupStudyPlans;
}

// Auto-inicializar si el DOM ya está listo y no estamos en el sistema modular
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Solo auto-inicializar si no estamos en el sistema modular
        if (!window.app) {
            initializeStudyPlans();
        }
    });
} else {
    // Solo auto-inicializar si no estamos en el sistema modular
    if (!window.app) {
        initializeStudyPlans();
    }
}