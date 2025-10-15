// Verificar autenticación y rol de docente (FUNCIONALIDAD ORIGINAL)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login.html'; return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'docente') {
            alert('Acceso denegado. Solo docentes pueden acceder.');
            window.location.href = '/index.html';
            return;
        }

        // Actualizar sidebar con nombre
        const welcomeEl = document.getElementById('welcomeUser');
        if (welcomeEl) welcomeEl.textContent = `${profile.name}`;
        if (profile.name.length > 16) {
            welcomeEl.classList.add('small');
        } else {
            welcomeEl.classList.remove('small');
        }

        // Actualizar inicial del avatar
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl && profile.name) {
            avatarEl.textContent = profile.name.charAt(0).toUpperCase();

            // Opcional: color dinámico según letra
            const colors = ['#3b82f6', '#6366f1', '#10b981', '#8b5cf6', '#ec4899'];
            const colorIndex = profile.name.charCodeAt(0) % colors.length;
            avatarEl.style.background = colors[colorIndex];
        }

        loadClassrooms(); // si tenés función equivalente para docentes
    } catch (error) {
        console.error(error);
        window.location.href = '/login.html';
    }
});

const textarea = document.getElementById('classroomDescription');
const charCount = document.getElementById('charCount');
const maxChars = 150;

textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    charCount.textContent = `${length} / ${maxChars}`;

    if (length >= maxChars) {
        charCount.style.color = 'red';
    } else {
        charCount.style.color = '';
    }
});

// Función original para cargar classrooms
async function loadClassrooms() {
    try {
        // Obtener token de la sesión
        const session = localStorage.getItem('session');
        const sessionData = session ? JSON.parse(session) : null;
        const accessToken = sessionData ? sessionData.access_token : null;

        if (!accessToken) {
            throw new Error('No hay token de acceso');
        }

        const response = await fetch('/api/classroom/teacher/classrooms', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error cargando classrooms');
        }

        const data = await response.json();
        displayClassrooms(data.classrooms);
        updateSidebarClassList(data.classrooms); // Nueva función para el sidebar
    } catch (error) {
        console.error('Error cargando classrooms:', error);
        document.getElementById('classroomsContent').innerHTML = `
                    <div class="empty-state">
                        <h3>Error al cargar classrooms</h3>
                        <p>No se pudieron cargar tus classrooms. Intenta recargar la página.</p>
                    </div>
                `;
    }
}

// Función mejorada para mostrar classrooms con el nuevo diseño
function displayClassrooms(classrooms) {
    const container = document.getElementById('classroomsContent');

    if (!classrooms || classrooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No tienes classrooms aún</h3>
                <p>Crea tu primer classroom para empezar a compartir materiales con tus estudiantes.</p>
                <button class="btn-primary" onclick="openCreateClassroomModal()">
                    Crear mi primer Classroom
                </button>
            </div>
        `;
        return;
    }

    const colors = ['color-green', 'color-blue', 'color-purple', 'color-pink', 'color-orange'];

    container.innerHTML = `
        <div class="classes-grid">
            ${classrooms.map((classroom, index) => {
        const letter = classroom.subject
            ? classroom.subject.charAt(0).toUpperCase()
            : classroom.name.charAt(0).toUpperCase();

        return `
                    <div class="class-card">
                        <div class="class-card-header ${colors[index % colors.length]}">
                            ${letter}
                        </div>
                        <div class="class-card-content">
                            <h3 class="classroom-title">${classroom.name}</h3>
                            <div class="class-detail">
                                <div class="classroom-subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z"></path></svg>
                                    ${classroom.subject}
                                </div>
                                <div class="classroom-stats" onclick="openStudentsModal(${classroom.id})">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22C2 17.5817 5.58172 14 10 14C14.4183 14 18 17.5817 18 22H16C16 18.6863 13.3137 16 10 16C6.68629 16 4 18.6863 4 22H2ZM10 13C6.685 13 4 10.315 4 7C4 3.685 6.685 1 10 1C13.315 1 16 3.685 16 7C16 10.315 13.315 13 10 13ZM10 11C12.21 11 14 9.21 14 7C14 4.79 12.21 3 10 3C7.79 3 6 4.79 6 7C6 9.21 7.79 11 10 11ZM18.2837 14.7028C21.0644 15.9561 23 18.752 23 22H21C21 19.564 19.5483 17.4671 17.4628 16.5271L18.2837 14.7028ZM17.5962 3.41321C19.5944 4.23703 21 6.20361 21 8.5C21 11.3702 18.8042 13.7252 16 13.9776V11.9646C17.6967 11.7222 19 10.264 19 8.5C19 7.11935 18.2016 5.92603 17.041 5.35635L17.5962 3.41321Z"></path></svg>
                                    Estudiantes: ${classroom.classroom_enrollments[0]?.count || 0}
                                </div>
                            </div>
                            
                            ${classroom.description ? `<div class="classroom-description">${classroom.description}</div>` : ''}
                              <div class="classroom-info"> 
                        

                            
                            <div style="margin-bottom: 16px;">
                                <label style="font-size: 0.875rem; color: #666; margin-bottom: 4px; display: block;">
                                    Código de unión:
                                </label>
                                <div class="join-code">${classroom.join_code}</div>
                            </div>
                            
                             </div>
                            <div class="classroom-actions">
                                <button class="btn-purple-large" onclick="viewClassroom(${classroom.id})">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
                                         stroke="currentColor" stroke-width="2">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                    </svg>
                                    Abrir
                                </button>
                                
                                <!-- Botón salir -->
                           <button class="btn-sidebar-menu-icon" 
        onclick="openDeleteClassroomModal(${classroom.id}, '${classroom.join_code}')" 
        title="Eliminar classroom">

                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"></path></svg>
                                    
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}


// Nueva función para actualizar el sidebar
function updateSidebarClassList(classrooms) {
    const container = document.getElementById('sidebarClassList');
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

    if (!classrooms || classrooms.length === 0) {
        container.innerHTML = '<li style="color: #94a3b8; font-size: 14px; padding: 12px;">No hay clases aún</li>';
        return;
    }

    container.innerHTML = classrooms.map((classroom, index) => `
             <li class="btn-sidebar-menu" onclick="viewClassroom(${classroom.id})">
    <div class="class-info">
        <div class="class-color" style="background-color: ${colors[index % colors.length]}"></div>
        <span class="class-name">${classroom.name}</span>
    </div>
    ${(classroom.classroom_enrollments[0]?.count || 0) > 30 ? '<div class="notification-dot"></div>' : ''}
</li>

            `).join('');
}

function selectClass(classId, event) {
    // Quitar clase active de todos los elementos
    document.querySelectorAll('.class-item').forEach(item => item.classList.remove('active'));

    // Encontrar el li más cercano
    const li = event.currentTarget || event.target.closest('.class-item');
    if (li) li.classList.add('active');

    // Aquí puedes cargar la clase seleccionada en el main content
    console.log('Clase seleccionada:', classId);
}


// FUNCIONES ORIGINALES MANTENIDAS
function openCreateClassroomModal() {
    const modal = document.getElementById('createClassroomModal');
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.modal-content-create');
    if (modalContent) {
        modalContent.classList.remove('animate-fadeOut');
        modalContent.classList.add('animate-fadeIn');
    }
}

function closeCreateClassroomModal() {
    const modal = document.getElementById('createClassroomModal');
    const modalContent = modal.querySelector('.modal-content-create');
    if (modalContent) {
        modalContent.classList.remove('animate-fadeIn');
        modalContent.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('createClassroomForm').reset();
        }, 300);
    } else {
        modal.style.display = 'none';
        document.getElementById('createClassroomForm').reset();
    }
}

function viewClassroom(classroomId) {
    if (!classroomId) return alert('ID de classroom no disponible');
    // Redirige a estudiantesPage.html pasando el ID como parámetro
    window.location.href = `/Pages/profesorPage.html?classroomId=${classroomId}`;
}

function manageMaterials(classroomId) {
    // Implementar gestión de materiales
    alert('Funcionalidad en desarrollo');
}

function viewStudents(classroomId) {
    // Implementar vista de estudiantes
    alert('Funcionalidad en desarrollo');
}

// Event listener para el botón de abrir modal (ORIGINAL)
const createButton = document.querySelector('.btn-primary');
if (createButton && createButton.textContent.includes('Crear')) {
    createButton.addEventListener('click', function () {
        openCreateClassroomModal();
    });
}

// Event listener para el formulario de crear classroom (FUNCIONALIDAD ORIGINAL COMPLETA)
const createForm = document.getElementById('createClassroomForm');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('classroomName').value,
            subject: document.getElementById('classroomSubject').value,
            grade_level: document.getElementById('classroomGrade').value,
            description: document.getElementById('classroomDescription').value
        };

        try {
            console.log('Enviando datos:', formData);

            // Obtener token de la sesión
            const session = localStorage.getItem('session');
            const sessionData = session ? JSON.parse(session) : null;
            const accessToken = sessionData ? sessionData.access_token : null;

            console.log('Token:', accessToken);

            if (!accessToken) {
                throw new Error('No hay token de acceso. Por favor, inicia sesión nuevamente.');
            }

            const response = await fetch('/api/classroom/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(formData)
            });

            console.log('Respuesta del servidor:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Error del servidor:', errorData);
                throw new Error(`Error ${response.status}: ${errorData}`);
            }

            const result = await response.json();
            console.log('Resultado exitoso:', result);
            closeCreateClassroomModal();
            loadClassrooms();
            alert('Classroom creado exitosamente');
        } catch (error) {
            console.error('Error creando classroom:', error);
            alert(`Error creando classroom: ${error.message}`);
        }
    });
}

// Event listeners para cerrar modales (ORIGINALES)
const createModal = document.getElementById('createClassroomModal');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.btn-secondary');

if (createModal) {
    createModal.addEventListener('click', function (event) {
        if (event.target === createModal) {
            closeCreateClassroomModal();
        }
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', function () {
        closeCreateClassroomModal();
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
        closeCreateClassroomModal();
    });
}



// Eliminar Classroom
let classroomToDelete = null;
let classroomJoinCode = null; // Código que se mostrará

function openDeleteClassroomModal(classroomId, joinCode) {
    classroomToDelete = classroomId;
    classroomJoinCode = joinCode; // Guardamos el código
    document.getElementById('deleteStep1').style.display = 'block';
    document.getElementById('deleteStep2').style.display = 'none';

    const modal = document.getElementById('deleteClassroomModal');
    modal.style.display = 'flex';
    modal.querySelector('.modal-content-warning').classList.remove('animate-fadeOut');
    modal.querySelector('.modal-content-warning').classList.add('animate-fadeIn');

    const joinDisplay = document.getElementById('joinCodeDisplay');
    joinDisplay.value = joinCode;
    joinDisplay.addEventListener('click', () => {
        navigator.clipboard.writeText(joinCode).then(() => alert('Código copiado al portapapeles'));
    });

    document.getElementById('confirmJoinCode').classList.remove('input-error');
    document.getElementById('confirmJoinCode').value = '';
}

function closeDeleteClassroomModal() {
    const modalContent = document.getElementById('deleteClassroomModal').querySelector('.modal-content-warning');
    modalContent.classList.remove('animate-fadeIn');
    modalContent.classList.add('animate-fadeOut');
    setTimeout(() => {
        document.getElementById('deleteClassroomModal').style.display = 'none';
        classroomToDelete = null;
        classroomJoinCode = null;
        document.getElementById('confirmJoinCode').value = '';
        document.getElementById('confirmJoinCode').classList.remove('input-error');
    }, 300);
}

function showDeleteStep2() {
    document.getElementById('deleteStep1').style.display = 'none';
    document.getElementById('deleteStep2').style.display = 'block';
    document.getElementById('confirmJoinCode').focus();
}

async function confirmDeleteClassroom() {
    const joinCodeInput = document.getElementById('confirmJoinCode');
    const joinCode = joinCodeInput.value.trim();
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (!joinCode || joinCode !== classroomJoinCode) {
        joinCodeInput.classList.add('input-error');
        return;
    }

    joinCodeInput.classList.remove('input-error');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Eliminando...';

    try {
        const session = localStorage.getItem('session');
        const accessToken = session ? JSON.parse(session).access_token : null;
        if (!accessToken) throw new Error('No hay token de acceso.');

        const response = await fetch(`/api/classroom/delete/${classroomToDelete}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ join_code: joinCode })
        });

        if (!response.ok) throw new Error('Código incorrecto o error eliminando classroom');

        alert('Classroom eliminado correctamente');
        closeDeleteClassroomModal();
        loadClassrooms();
    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Eliminar';
    }
}

document.getElementById('deleteClassroomModal').addEventListener('click', function (e) {
    if (e.target === this) closeDeleteClassroomModal();
});


// Función para generar color basado en un string (id del estudiante)
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 50%)`; // HSL para colores vivos
    return color;
}

async function openStudentsModal(classroomId) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión expirada");

        const response = await fetch(`/api/classroom/${classroomId}/students`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error("Error al cargar estudiantes");
        const students = await response.json();

        const listContainer = document.getElementById('studentsModalList');

        if (!students.length) {
            listContainer.innerHTML = '<li>No hay estudiantes inscritos</li>';
        } else {
            listContainer.innerHTML = students
                .map(s => {
                    const color = stringToColor(s.id); // color basado en id
                    return `
                    <li>
                        <div class="student-avatar" style="background-color: ${color};">
                            ${s.name.charAt(0)}
                        </div>
                        <span>${s.name}</span>
                    </li>
                    `;
                }).join('');
        }

        const modal = document.getElementById('studentsModal');
        modal.style.display = 'flex';
        modal.querySelector('.modal-content-students').classList.remove('animate-fadeOut');
        modal.querySelector('.modal-content-students').classList.add('animate-fadeIn');
    } catch (err) {
        alert(err.message);
    }
}

function closeStudentsModal() {
    const modalContent = document.getElementById('studentsModal').querySelector('.modal-content-students');
    modalContent.classList.remove('animate-fadeIn');
    modalContent.classList.add('animate-fadeOut');
    setTimeout(() => {
        document.getElementById('studentsModal').style.display = 'none';
        
    }, 300);
}

document.getElementById('btnhome').addEventListener('click', function () {
    window.location.href = '/index.html';
});
