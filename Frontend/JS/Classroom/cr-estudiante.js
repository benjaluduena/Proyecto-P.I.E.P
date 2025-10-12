
// Mantener funcionalidad original de estudiante
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login.html'; return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'estudiante') {
            alert('Acceso denegado. Solo estudiantes pueden acceder.');
            window.location.href = '/index.html';
            return;
        }

        // Actualizar el sidebar con el nombre
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
        }

        loadClassrooms();
    } catch (error) {
        console.error(error);
        window.location.href = '/login.html';
    }
});



async function loadClassrooms() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login.html'; return; }

        const response = await fetch('/api/classroom/student/classrooms', {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error('Error cargando classrooms');
        const data = await response.json();
        displayClassrooms(data.classrooms);
        updateSidebarClassList(data.classrooms);
    } catch (error) {
        document.getElementById('classroomsContent').innerHTML = `<div class="empty-state"><h3>Error al cargar classrooms</h3><p>${error.message}</p></div>`;
    }
}

function displayClassrooms(classrooms) {
    const container = document.getElementById('classroomsContent');

    if (!classrooms || classrooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No estás inscrito en ningún classroom</h3>
                <p>Únete a un classroom usando el código que te proporcionó tu docente.</p>
                <button class="btn-primary" onclick="openJoinClassroomModal()">
                    Unirse a Classroom
                </button>
            </div>
        `;
        return;
    }

    const colors = ['color-green', 'color-green', 'color-blue', 'color-purple', 'color-pink'];

    container.innerHTML = `
        <div class="classes-grid">
            ${classrooms.map((enrollment, index) => {
        const classroom = enrollment.classroom || {};
        const {
            id = 0,
            name: classroomName = 'Sin nombre',
            teacher,
            subject = '',
            description = '',
            classroom_materials = [],
            lastActivity = '10/08/2025'
        } = classroom;

        const teacherName = teacher?.name || 'Sin docente';
        const materialsCount = classroom_materials[0]?.count || 0;
        const colorClass = colors[index % colors.length];
        const letter = subject ? subject.charAt(0).toUpperCase() : classroomName.charAt(0).toUpperCase();

        return `
                    <div class="class-card">
                        <div class="class-card-content">
                            <div class="class-header">
                                <div class="class-icon-container ${colorClass}">
                                    ${letter}
                                </div>
                                <button class="btn-delete" onclick="leaveClassroom(${id})" title="Salir del classroom">
                                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18H6V20H18V4H6V6H4V3C4 2.44772 4.44772 2 5 2H19C19.5523 2 20 2.44772 20 3V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V18ZM6 11H13V13H6V16L1 12L6 8V11Z"></path></svg>


                                </button>
                            </div>

                            <h3 class="classroom-title">${classroomName}</h3>
                            <div class="classroom-info">
                                <div class="classroom-subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z"></path></svg>
                                    ${classroom.subject}
                                </div>
                                <div class="classroom-teacher">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H4ZM13 16.083V20H17.6586C16.9423 17.9735 15.1684 16.4467 13 16.083ZM11 20V16.083C8.83165 16.4467 7.05766 17.9735 6.34141 20H11ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.2104 11 16 9.21043 16 7C16 4.78957 14.2104 3 12 3C9.78957 3 8 4.78957 8 7C8 9.21043 9.78957 11 12 11Z"></path></svg>
                                    ${teacherName}
                                </div>
                            </div>
                            ${description ? `<div class="classroom-description">${description}</div>` : ''}

                            <div class="classroom-actions">
                                <button class="btn-purple-large" onclick="viewClassroomDetails(${id})">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"></path></svg>
                                    Abrir
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function openJoinClassroomModal() {
    const modal = document.getElementById('joinClassroomModal');
    modal.style.display = 'flex';
    modal.querySelector('.modal-content-join').classList.remove('animate-fadeOut');
    modal.querySelector('.modal-content-join').classList.add('animate-fadeIn');
}

function closeJoinClassroomModal() {
    const modal = document.getElementById('joinClassroomModal');
    const form = document.getElementById('joinClassroomForm');
    if (form) form.reset();
    const modalContent = modal.querySelector('.modal-content-join');
    modalContent.classList.remove('animate-fadeIn');
    modalContent.classList.add('animate-fadeOut');
    setTimeout(() => {
        modal.style.display = 'none';
        modalContent.classList.remove('animate-fadeOut');
    }, 300); // Ajusta el tiempo según tu animación CSS
}

document.getElementById('joinClassroomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const joinCode = document.getElementById('joinCode').value.toUpperCase();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/classroom/join', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ join_code: joinCode }) });
        if (!response.ok) throw new Error('Error uniéndose al classroom');
        const result = await response.json();
        closeJoinClassroomModal();
        loadClassrooms();
        alert(`Te has unido exitosamente a "${result.classroom.name}"`);
    } catch (error) { alert(error.message || 'Error uniéndose al classroom'); }
});

function viewClassroomDetails(classroomId) {
    if (!classroomId) return alert('ID de classroom no disponible');
    // Redirige a estudiantesPage.html pasando el ID como parámetro
    window.location.href = `/Pages/estudiantesPage.html?classroomId=${classroomId}`;
}


//Funciones para abrir/cerrar modal y ejecutar salida
let classroomToLeave = null;

function leaveClassroom(classroomId) {
    classroomToLeave = classroomId;
    const modal = document.getElementById('leaveClassroomModal');
    modal.style.display = 'flex';
    modal.querySelector('.modal-content-warning').classList.remove('animate-fadeOut');
    modal.querySelector('.modal-content-warning').classList.add('animate-fadeIn');
}

function closeLeaveClassroomModal() {
    classroomToLeave = null;
    const modal = document.getElementById('leaveClassroomModal');
    const modalContent = modal.querySelector('.modal-content-warning');
    modalContent.classList.remove('animate-fadeIn');
    modalContent.classList.add('animate-fadeOut');
    setTimeout(() => {
        modal.style.display = 'none';
        modalContent.classList.remove('animate-fadeOut');
    }, 300); // Ajusta el tiempo según tu animación CSS
}

// Confirmar salida
document.getElementById('confirmLeaveBtn').addEventListener('click', async () => {
    if (!classroomToLeave) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/classroom/${classroomToLeave}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error dejando el classroom');
        }

        alert('Has salido del classroom');
        closeLeaveClassroomModal();
        loadClassrooms();

    } catch (error) {
        alert(error.message);
        closeLeaveClassroomModal();
    }
});


function updateSidebarClassList(classrooms) {
    const container = document.getElementById('sidebarClassList');
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

    if (!classrooms || classrooms.length === 0) {
        container.innerHTML = '<li style="color: #94a3b8; font-size: 14px; padding: 12px;">No hay clases aún</li>';
        return;
    }

    container.innerHTML = classrooms.map((enrollment, index) => {
        const classroom = enrollment.classroom;
        const color = colors[index % colors.length];
        const letter = classroom.name ? classroom.name.charAt(0).toUpperCase() : '?';
        return `
            <li class="btn-sidebar-menu" onclick="viewClassroomDetails(${classroom.id})">
                <div class="class-info">
                    <div class="class-color" style="background-color: ${color}"></div>
                    <span class="class-name">${classroom.name}</span>
                </div>
            </li>
        `;
    }).join('');
}
document.getElementById('btnhome').addEventListener('click', function () {
    window.location.href = '/index.html';
});