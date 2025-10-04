class ClassroomManager {
  constructor(classroomId) {
    this.classroomId = classroomId;
    this.currentUser = null;
    this.classroomData = null;
    this.resources = [];
    this.init();
  }

 async shareResource(resourceId) {
    const res = await fetch('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, classId: 1 })
    });

    if(res.ok) {
        alert('Recurso compartido!');
        // recargar posts
        loadPosts();
    }
}


  async init() {
    try {
      await this.checkAuth();
      await this.loadClassroomData();
      await this.loadSharedResources();
      this.setupEventListeners();
      console.log('✅ Classroom manager inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando classroom manager:', error);
      this.showError('Error inicializando el classroom');
    }
  }

  async checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No hay sesión activa');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No se pudo obtener el usuario');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'docente') {
      throw new Error('Acceso denegado. Solo docentes pueden acceder a esta página.');
    }

    this.currentUser = { ...user, ...profile };
    console.log('✅ Usuario autenticado:', this.currentUser.name);
  }

  async loadClassroomData() {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', this.classroomId)
      .single();

    if (error) {
      console.error('Error cargando classroom:', error);
      this.classroomData = null;
      return;
    }

    this.classroomData = data;
    this.updateClassroomUI();
    console.log('✅ Datos del classroom cargados:', this.classroomData);
  }

  async loadSharedResources() {
    try {
      const { data, error } = await supabase
        .from('classroom_materials')
        .select('*')
        .eq('classroom_id', this.classroomId);

      if (error) throw error;

      this.resources = data || [];
      this.displaySharedResources();
      console.log('✅ Recursos cargados:', this.resources.length);
    } catch (error) {
      console.error('Error cargando recursos:', error);
      this.resources = [];
    }
  }

  updateClassroomUI() {
    if (!this.classroomData) return;

    document.title = `${this.classroomData.name} - P.I.E.P.`;
    const currentClassName = document.getElementById('currentClassName');
    if (currentClassName) currentClassName.textContent = this.classroomData.name;

    this.displayClassroomInfo();
  }

  displayClassroomInfo() {
    const container = document.getElementById('classroomInfo');
    if (!container || !this.classroomData) return;

    container.innerHTML = `
      <h3>${this.classroomData.name}</h3>
      <p>Materia: ${this.classroomData.subject || 'Sin especificar'}</p>
      <p>Nivel: ${this.classroomData.grade_level || 'Sin especificar'}</p>
      <p>${this.classroomData.description || ''}</p>
    `;
  }

  displaySharedResources() {
    const container = document.getElementById('sharedResources');
    if (!container) return;

    if (this.resources.length === 0) {
      container.innerHTML = `<p>No hay recursos compartidos.</p>`;
      return;
    }

    container.innerHTML = this.resources.map(r => `
      <div class="resource-card">
        <h4>${r.title || 'Sin título'}</h4>
        <p>${r.description || ''}</p>
        <small>Tipo: ${r.resource_type || 'Desconocido'}</small>
      </div>
    `).join('');
  }

  setupEventListeners() {
    const backBtn = document.getElementById('backToClassrooms');
    if (backBtn) backBtn.addEventListener('click', () => {
      window.location.href = '../classroom-teacher.html';
    });
  }

  showError(message) {
    console.error('Error:', message);
    alert(message);
  }
}


window.ClassroomManager = ClassroomManager;
