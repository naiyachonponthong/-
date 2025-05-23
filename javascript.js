<script>

// ตัวแปรสำคัญ
let userData = null;
let sessionId = null;
let currentSubject = null;
let classes = [];
let subjects = [];
let teachers = [];
let students = [];
let assignments = [];
let systemConfig = {};
let allStudents = []; // เก็บข้อมูลนักเรียนทั้งหมด
let filteredStudents = []; // เก็บข้อมูลนักเรียนที่กรองแล้ว
let currentSearchTerm = ''; // คำค้นหาปัจจุบัน
let currentClassFilter = ''; // ตัวกรองระดับชั้นปัจจุบัน
let allTeachers = []; // เก็บข้อมูลครูทั้งหมด
let filteredTeachers = []; // เก็บข้อมูลครูที่กรองแล้ว
let currentTeacherSearchTerm = ''; // คำค้นหาปัจจุบัน


// ฟังก์ชันเริ่มต้น
function init() {
  console.log("Initializing app...");
  
  // ตรวจสอบว่ามี session ที่บันทึกไว้หรือไม่
  const savedSession = localStorage.getItem('sessionId');
  console.log("Saved session found:", savedSession ? "Yes" : "No");
  
  if (savedSession) {
    // แสดงหน้าโหลด
    document.getElementById('loading-spinner').classList.remove('hidden');
    
    // ตรวจสอบความถูกต้องของ session
    google.script.run
      .withSuccessHandler(function(response) {
        console.log("Session check response:", response);
        checkSessionSuccess(response);
      })
      .withFailureHandler(function(error) {
        console.log("Session check error:", error);
        checkSessionFailure(error);
      })
      .checkSession(savedSession);
  } else {
    // แสดงหน้าเข้าสู่ระบบ
    showLoginForm();
    // ซ่อนหน้าโหลด
    document.getElementById('loading-spinner').classList.add('hidden');
  }
}

// ฟังก์ชันเกี่ยวกับการเข้าสู่ระบบ
function showLoginForm() {
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('login-container').classList.remove('hidden');
  
  // รีเซ็ตฟอร์ม
  document.getElementById('login-form').reset();
  document.getElementById('login-error').classList.add('hidden');
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(loginSuccess)
    .withFailureHandler(loginFailure)
    .login(username, password);
}

function loginSuccess(response) {
  document.getElementById('loading-spinner').classList.add('hidden');
  
  if (response.status === 'success') {
    // บันทึกข้อมูลผู้ใช้และ session
    userData = response.user;
    sessionId = response.user.session_id;
    
    // บันทึกลง localStorage และตรวจสอบว่าบันทึกสำเร็จหรือไม่
    try {
      localStorage.setItem('sessionId', sessionId);
      const savedSession = localStorage.getItem('sessionId');
      console.log("Session saved successfully:", savedSession === sessionId);
      
      if (savedSession !== sessionId) {
        console.error("Failed to save session to localStorage");
        
        Swal.fire({
          icon: 'warning',
          title: 'คำเตือน',
          text: 'ไม่สามารถบันทึกข้อมูลการเข้าสู่ระบบได้ คุณอาจต้องเข้าสู่ระบบใหม่หลังจากรีเฟรชหน้า',
          confirmButtonText: 'ตกลง'
        });
      }
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
    
    // แสดงชื่อผู้ใช้
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-role').textContent = translateRole(userData.role);
    
    // แสดงหน้าหลัก
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // โหลดการตั้งค่าระบบ
    loadSystemConfig();
    
    // แสดงส่วนที่เหมาะสมตามบทบาท
    if (userData.role === 'admin') {
      showAdminDashboard();
    } else if (userData.role === 'teacher') {
      showTeacherDashboard();
    } else if (userData.role === 'student') {
      showStudentDashboard();
    }
  } else {
    // แสดงข้อความผิดพลาด
    Swal.fire({
      icon: 'error',
      title: 'เข้าสู่ระบบไม่สำเร็จ',
      text: response.message,
      confirmButtonText: 'ตกลง'
    });
  }
}

function loginFailure(error) {
  document.getElementById('loading-spinner').classList.add('hidden');
  
  Swal.fire({
    icon: 'error',
    title: 'เกิดข้อผิดพลาด',
    text: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message,
    confirmButtonText: 'ตกลง'
  });
}

function checkSessionSuccess(response) {
  if (response.status === 'success') {
    // บันทึกข้อมูลผู้ใช้
    userData = response.user;
    sessionId = localStorage.getItem('sessionId');
    
    // แสดงชื่อผู้ใช้
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-role').textContent = translateRole(userData.role);
    
    // แสดงหน้าหลัก
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // โหลดการตั้งค่าระบบ
    loadSystemConfig();
    
    // แสดงส่วนที่เหมาะสมตามบทบาท
    if (userData.role === 'admin') {
      showAdminDashboard();
    } else if (userData.role === 'teacher') {
      showTeacherDashboard();
    } else if (userData.role === 'student') {
      showStudentDashboard();
    }
  } else {
    // session ไม่ถูกต้อง ให้เข้าสู่ระบบใหม่
    localStorage.removeItem('sessionId');
    showLoginForm();
  }
}

function checkSessionFailure(error) {
  // เกิดข้อผิดพลาด ให้เข้าสู่ระบบใหม่
  localStorage.removeItem('sessionId');
  showLoginForm();
}

function logout() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(logoutSuccess)
    .withFailureHandler(logoutFailure)
    .logout(sessionId);
}

function logoutSuccess(response) {
  document.getElementById('loading-spinner').classList.add('hidden');
  
  // ลบข้อมูล session
  userData = null;
  sessionId = null;
  localStorage.removeItem('sessionId');
  
  // กลับไปที่หน้าเข้าสู่ระบบ
  showLoginForm();
}

function logoutFailure(error) {
  document.getElementById('loading-spinner').classList.add('hidden');
  
  // ลบข้อมูล session และกลับไปที่หน้าเข้าสู่ระบบ
  userData = null;
  sessionId = null;
  localStorage.removeItem('sessionId');
  showLoginForm();
}

// ฟังก์ชันสำหรับการตั้งค่าระบบ
function loadSystemConfig() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        systemConfig = response.config;
      } else {
        console.error('ไม่สามารถโหลดการตั้งค่าระบบได้:', response.message);
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      console.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่าระบบ:', error);
    })
    .getConfig();
}

function setupSystemConfig() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'ตั้งค่าระบบครั้งแรกเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง'
        }).then(() => {
          loadSystemConfig();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: response.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถตั้งค่าระบบได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .setupSheets();
}

function showSettingsSection() {
  hideAllSections();
  document.getElementById('settings-content').classList.remove('hidden');
  
  // โหลดข้อมูลการตั้งค่า
  if (systemConfig) {
    document.getElementById('school-name-input').value = systemConfig.school_name || '';
    document.getElementById('school-description-input').value = systemConfig.school_description || '';
    document.getElementById('admin-email-input').value = systemConfig.admin_email || '';
    document.getElementById('semester-input').value = systemConfig.semester || '';
    document.getElementById('pass-score-input').value = systemConfig.pass_score || 50;
  }
}

function saveSettings() {
  const configData = {
    school_name: document.getElementById('school-name-input').value,
    school_description: document.getElementById('school-description-input').value,
    admin_email: document.getElementById('admin-email-input').value,
    semester: document.getElementById('semester-input').value,
    pass_score: document.getElementById('pass-score-input').value,
    profile_folder_id: systemConfig.profile_folder_id || '',
    school_logo: systemConfig.school_logo || '',
    grade_types: systemConfig.grade_types || ['พื้นฐาน', 'เพิ่มเติม', 'เลือกเสรี', 'กิจกรรมพัฒนาผู้เรียน']
  };
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง'
        }).then(() => {
          // อัปเดตข้อมูลการตั้งค่าในตัวแปร
          systemConfig = configData;
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: response.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกการตั้งค่าได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .saveConfig(sessionId, configData);
}

function showAdminDashboard() {
  // ซ่อนเมนูสำหรับครูและนักเรียน
  document.getElementById('teacher-menu').classList.add('hidden');
  document.getElementById('student-menu').classList.add('hidden');
  
  // แสดงเมนูสำหรับผู้ดูแลระบบ
  document.getElementById('admin-menu').classList.remove('hidden');
  
  // แสดงหน้าแดชบอร์ด
  hideAllSections();
  document.getElementById('admin-dashboard-content').classList.remove('hidden');
  
  // เลือกเมนูหน้าหลัก
  setActiveMenuItem('menu-dashboard');
  
  // โหลดข้อมูลพื้นฐานทั้งหมดล่วงหน้า
  preloadBasicData();
}

function preloadBasicData() {
  console.log('Preloading basic data...');
  
  // โหลดข้อมูลพื้นฐานทั้งหมดแบบไม่รอ (background loading)
  google.script.run
    .withSuccessHandler(function(results) {
      if (results.status === 'success') {
        classes = results.classes || [];
        console.log('Classes preloaded:', classes.length);
      }
    })
    .withFailureHandler(function(error) {
      console.warn('Failed to preload classes:', error);
    })
    .getClasses(sessionId);
  
  google.script.run
    .withSuccessHandler(function(results) {
      if (results.status === 'success') {
        subjects = results.subjects || [];
        console.log('Subjects preloaded:', subjects.length);
      }
    })
    .withFailureHandler(function(error) {
      console.warn('Failed to preload subjects:', error);
    })
    .getSubjects(sessionId);
  
  google.script.run
    .withSuccessHandler(function(results) {
      if (results.status === 'success') {
        assignments = results.assignments || [];
        console.log('Assignments preloaded:', assignments.length);
      }
    })
    .withFailureHandler(function(error) {
      console.warn('Failed to preload assignments:', error);
    })
    .getAssignments(sessionId);
}

function hideAllSections() {
  const contentSections = document.querySelectorAll('#main-content > div');
  contentSections.forEach(section => {
    section.classList.add('hidden');
  });
}

function setActiveMenuItem(menuId) {
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.classList.remove('active');
  });
  
  document.getElementById(menuId).classList.add('active');
}

// จัดการระดับชั้น
function showClassesSection() {
  hideAllSections();
  document.getElementById('classes-content').classList.remove('hidden');
  setActiveMenuItem('menu-classes');
  
  // โหลดข้อมูลระดับชั้น
  loadClasses();
}

function loadClasses() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      classes = results.classes || [];
      renderClassesTable();
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลระดับชั้นได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getClasses(sessionId);
}

function renderClassesTable() {
  const tableBody = document.getElementById('classes-table-body');
  tableBody.innerHTML = '';
  
  if (classes.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="4" style="text-align: center; padding: 20px; color: #7f8c8d;">ไม่พบข้อมูลระดับชั้น</td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  classes.forEach(cls => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cls.name}</td>
      <td>${cls.student_count || 0} คน</td>
      <td>${formatDate(cls.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editClass('${cls.class_id}')">
          <i class="fas fa-edit"></i> แก้ไข
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteClass('${cls.class_id}')">
          <i class="fas fa-trash"></i> ลบ
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  // อัปเดตตัวเลือกในฟอร์มนักเรียนและการมอบหมาย
  populateClassSelect();
}

function showClassModal(isEdit = false) {
  document.getElementById('class-modal-title').textContent = isEdit ? 'แก้ไขระดับชั้น' : 'เพิ่มระดับชั้น';
  document.getElementById('class-form').reset();
  document.getElementById('class-id').value = '';
  
  // แสดง modal
  document.getElementById('class-modal-overlay').classList.add('active');
}

function saveClass() {
  const classId = document.getElementById('class-id').value;
  const className = document.getElementById('class-name').value;
  
  if (!className) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดระบุชื่อระดับชั้น',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  if (classId) {
    // แก้ไขระดับชั้น
    google.script.run
      .withSuccessHandler(function(response) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        if (response.status === 'success') {
          // ปิด modal
          document.getElementById('class-modal-overlay').classList.remove('active');
          
          // โหลดข้อมูลระดับชั้นใหม่
          loadClasses();
          
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'แก้ไขระดับชั้นเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: response.message,
            confirmButtonText: 'ตกลง'
          });
        }
      })
      .withFailureHandler(function(error) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถแก้ไขระดับชั้นได้: ' + error.message,
          confirmButtonText: 'ตกลง'
        });
      })
      .updateClass(sessionId, classId, className);
  } else {
    // เพิ่มระดับชั้นใหม่
    google.script.run
      .withSuccessHandler(function(response) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        if (response.status === 'success') {
          // ปิด modal
          document.getElementById('class-modal-overlay').classList.remove('active');
          
          // โหลดข้อมูลระดับชั้นใหม่
          loadClasses();
          
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'เพิ่มระดับชั้นเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: response.message,
            confirmButtonText: 'ตกลง'
          });
        }
      })
      .withFailureHandler(function(error) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถเพิ่มระดับชั้นได้: ' + error.message,
          confirmButtonText: 'ตกลง'
        });
      })
      .addClass(sessionId, className);
  }
}

function editClass(classId) {
  // ค้นหาข้อมูลระดับชั้น
  const classObj = classes.find(c => c.class_id === classId);
  if (!classObj) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลระดับชั้น',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // เปิด modal แก้ไข
  document.getElementById('class-id').value = classId;
  document.getElementById('class-name').value = classObj.name;
  document.getElementById('class-modal-title').textContent = 'แก้ไขระดับชั้น';
  document.getElementById('class-modal-overlay').classList.add('active');
}

function deleteClass(classId) {
  Swal.fire({
    title: 'ยืนยันการลบ',
    text: "คุณแน่ใจหรือไม่ที่จะลบระดับชั้นนี้? นักเรียนทั้งหมดในระดับชั้นนี้จะถูกลบด้วย",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // แสดงหน้าโหลด
      document.getElementById('loading-spinner').classList.remove('hidden');
      
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            // โหลดข้อมูลระดับชั้นใหม่
            loadClasses();
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'ลบระดับชั้นเรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถลบระดับชั้นได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .deleteClass(sessionId, classId);
    }
  });
}

// จัดการรายวิชา
function showSubjectsSection() {
  hideAllSections();
  document.getElementById('subjects-content').classList.remove('hidden');
  setActiveMenuItem('menu-subjects');
  
  // โหลดข้อมูลรายวิชา
  loadSubjects();
}

function loadSubjects() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      subjects = results.subjects || [];
      renderSubjectsTable();
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลรายวิชาได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getSubjects(sessionId);
}

function renderSubjectsTable() {
  const tableBody = document.getElementById('subjects-table-body');
  tableBody.innerHTML = '';
  
  if (subjects.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">ไม่พบข้อมูลรายวิชา</td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  subjects.forEach(subject => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${subject.code}</td>
      <td>${subject.name}</td>
      <td>${subject.type}</td>
      <td>${subject.credit}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editSubject('${subject.subject_id}')">
          <i class="fas fa-edit"></i> แก้ไข
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteSubject('${subject.subject_id}')">
          <i class="fas fa-trash"></i> ลบ
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  // อัปเดตตัวเลือกในฟอร์มการมอบหมาย
  populateSubjectSelect();
}

function showSubjectModal(isEdit = false) {
  document.getElementById('subject-modal-title').textContent = isEdit ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชา';
  document.getElementById('subject-form').reset();
  document.getElementById('subject-id').value = '';
  
  // แสดง modal
  document.getElementById('subject-modal-overlay').classList.add('active');
}

function saveSubject() {
  const subjectId = document.getElementById('subject-id').value;
  const subjectData = {
    code: document.getElementById('subject-code').value,
    name: document.getElementById('subject-name').value,
    type: document.getElementById('subject-type').value,
    credit: document.getElementById('subject-credit').value
  };
  
  if (!subjectData.code || !subjectData.name || !subjectData.type || !subjectData.credit) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดระบุรหัสวิชา, ชื่อวิชา, ประเภท และหน่วยกิต',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  if (subjectId) {
    // แก้ไขรายวิชา
    google.script.run
      .withSuccessHandler(function(response) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        if (response.status === 'success') {
          // ปิด modal
          document.getElementById('subject-modal-overlay').classList.remove('active');
          
          // โหลดข้อมูลรายวิชาใหม่
          loadSubjects();
          
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'แก้ไขรายวิชาเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: response.message,
            confirmButtonText: 'ตกลง'
          });
        }
      })
      .withFailureHandler(function(error) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถแก้ไขรายวิชาได้: ' + error.message,
          confirmButtonText: 'ตกลง'
        });
      })
      .updateSubject(sessionId, subjectId, subjectData);
  } else {
    // เพิ่มรายวิชาใหม่
    google.script.run
      .withSuccessHandler(function(response) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        if (response.status === 'success') {
          // ปิด modal
          document.getElementById('subject-modal-overlay').classList.remove('active');
          
          // โหลดข้อมูลรายวิชาใหม่
          loadSubjects();
          
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'เพิ่มรายวิชาเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: response.message,
            confirmButtonText: 'ตกลง'
          });
        }
      })
      .withFailureHandler(function(error) {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถเพิ่มรายวิชาได้: ' + error.message,
          confirmButtonText: 'ตกลง'
        });
      })
      .addSubject(sessionId, subjectData);
  }
}

function editSubject(subjectId) {
  // ค้นหาข้อมูลรายวิชา
  const subject = subjects.find(s => s.subject_id === subjectId);
  if (!subject) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลรายวิชา',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // เปิด modal แก้ไข
  document.getElementById('subject-id').value = subjectId;
  document.getElementById('subject-code').value = subject.code;
  document.getElementById('subject-name').value = subject.name;
  document.getElementById('subject-type').value = subject.type;
  document.getElementById('subject-credit').value = subject.credit;
  document.getElementById('subject-modal-title').textContent = 'แก้ไขรายวิชา';
  document.getElementById('subject-modal-overlay').classList.add('active');
}

function deleteSubject(subjectId) {
  Swal.fire({
    title: 'ยืนยันการลบ',
    text: "คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้? ผลการเรียนทั้งหมดในรายวิชานี้จะถูกลบด้วย",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // แสดงหน้าโหลด
      document.getElementById('loading-spinner').classList.remove('hidden');
      
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            // โหลดข้อมูลรายวิชาใหม่
            loadSubjects();
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'ลบรายวิชาเรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถลบรายวิชาได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .deleteSubject(sessionId, subjectId);
    }
  });
}

// จัดการครูผู้สอน
function showTeachersSection() {
  hideAllSections();
  document.getElementById('teachers-content').classList.remove('hidden');
  setActiveMenuItem('menu-teachers');
  
  // โหลดข้อมูลครูผู้สอน
  loadTeachers();
}

function loadTeachers() {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลครูผู้สอนและข้อมูลอื่นๆ พร้อมกัน
  Promise.all([
    // โหลดข้อมูลครูผู้สอน
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getTeachers(sessionId);
    }),
    // โหลดข้อมูลรายวิชา
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getSubjects(sessionId);
    }),
    // โหลดข้อมูลระดับชั้น
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getClasses(sessionId);
    }),
    // โหลดข้อมูลการมอบหมาย
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getAssignments(sessionId);
    })
  ]).then(results => {
    document.getElementById('loading-spinner').classList.add('hidden');
    
    // เก็บข้อมูลในตัวแปรโกลบอล
    allTeachers = results[0].teachers || [];
    teachers = allTeachers; // กำหนดค่าเริ่มต้น
    subjects = results[1].subjects || [];
    classes = results[2].classes || [];
    assignments = results[3].assignments || [];
    
    // รีเซ็ตการค้นหา
    currentTeacherSearchTerm = '';
    document.getElementById('search-teacher').value = '';
    
    // ทำการกรองและแสดงผล
    filterAndSearchTeachers();
    
    console.log('Loaded data:', {
      teachers: allTeachers.length,
      subjects: subjects.length,
      classes: classes.length,
      assignments: assignments.length
    });
    
  }).catch(error => {
    document.getElementById('loading-spinner').classList.add('hidden');
    
    console.error('Error loading data:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
      confirmButtonText: 'ตกลง'
    });
  });
}

// ฟังก์ชันค้นหาและกรองครูผู้สอน
function filterAndSearchTeachers() {
  let result = allTeachers;
  
  // ค้นหาตามคำค้นหา
  if (currentTeacherSearchTerm) {
    const searchLower = currentTeacherSearchTerm.toLowerCase();
    result = result.filter(teacher => {
      return (
        (teacher.username && teacher.username.toLowerCase().includes(searchLower)) ||
        (teacher.name && teacher.name.toLowerCase().includes(searchLower)) ||
        (teacher.email && teacher.email.toLowerCase().includes(searchLower)) ||
        (teacher.phone && teacher.phone.includes(searchLower))
      );
    });
  }
  
  filteredTeachers = result;
  teachers = filteredTeachers; // อัปเดตตัวแปร teachers เพื่อใช้ในการแสดงผล
  
  // แสดงผลลัพธ์การค้นหา
  updateTeacherSearchResultsInfo();
  
  // แสดงตาราง
  renderTeachersTable();
}

// ฟังก์ชันอัปเดตข้อมูลผลการค้นหา
function updateTeacherSearchResultsInfo() {
  const searchResultsInfo = document.getElementById('teacher-search-results-info');
  const searchResultsText = document.getElementById('teacher-search-results-text');
  const clearSearchBtn = document.getElementById('clear-teacher-search');
  
  if (currentTeacherSearchTerm) {
    let infoText = `แสดงผล ${filteredTeachers.length} รายการ จากทั้งหมด ${allTeachers.length} รายการ (ค้นหา: "${currentTeacherSearchTerm}")`;
    
    searchResultsText.textContent = infoText;
    searchResultsInfo.classList.remove('hidden');
    clearSearchBtn.style.display = 'block';
  } else {
    searchResultsInfo.classList.add('hidden');
    clearSearchBtn.style.display = 'none';
  }
}

// ฟังก์ชันล้างการค้นหา
function clearTeacherSearch() {
  currentTeacherSearchTerm = '';
  
  // ล้างช่องค้นหา
  document.getElementById('search-teacher').value = '';
  
  // แสดงข้อมูลทั้งหมด
  filterAndSearchTeachers();
}

// ฟังก์ชันจัดการการค้นหา
function handleTeacherSearch() {
  const searchInput = document.getElementById('search-teacher');
  currentTeacherSearchTerm = searchInput.value.trim();
  filterAndSearchTeachers();
}

function renderTeachersTable() {
  const tableBody = document.getElementById('teachers-table-body');
  tableBody.innerHTML = '';
  
  if (teachers.length === 0) {
    const message = currentTeacherSearchTerm ? 
      'ไม่พบข้อมูลครูผู้สอนที่ตรงกับเงื่อนไขการค้นหา' : 
      'ไม่พบข้อมูลครูผู้สอน';
      
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="7" style="text-align: center; padding: 20px; color: #7f8c8d;">${message}</td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  // ฟังก์ชันไฮไลต์คำค้นหา
  const highlightText = (text, searchTerm) => {
    if (!text || !searchTerm) return text || '';
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffeb3b; padding: 1px 2px;">$1</mark>');
  };
  
  teachers.forEach(teacher => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center;">
          ${teacher.profile_image ? 
            `<img src="${teacher.profile_image}" alt="รูปโปรไฟล์" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px; object-fit: cover;">` : 
            `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #f0f0f0; margin-right: 10px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: #ccc;"></i></div>`
          }
          <div>
            <div style="font-weight: bold;">${highlightText(teacher.name, currentTeacherSearchTerm)}</div>
            <div style="font-size: 0.8em; color: #666;">${highlightText(teacher.username, currentTeacherSearchTerm)}</div>
          </div>
        </div>
      </td>
      <td>${highlightText(teacher.username, currentTeacherSearchTerm)}</td>
      <td>${highlightText(teacher.name, currentTeacherSearchTerm)}</td>
      <td>${highlightText(teacher.email, currentTeacherSearchTerm)}</td>
      <td>${highlightText(teacher.phone || '-', currentTeacherSearchTerm)}</td>
      <td>${formatDate(teacher.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="viewTeacher('${teacher.user_id}')" title="ดูรายละเอียด">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-primary" onclick="editTeacher('${teacher.user_id}')" title="แก้ไข">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="resetPassword('${teacher.user_id}', '${teacher.name}')" title="รีเซ็ตรหัสผ่าน">
          <i class="fas fa-key"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteTeacher('${teacher.user_id}')" title="ลบ">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  // อัปเดตตัวเลือกในฟอร์มการมอบหมาย
  populateTeacherSelect();
  
  console.log('Teachers table rendered:', teachers.length, 'teachers (filtered from', allTeachers.length, 'total)');
}

function viewTeacher(teacherId) {
  // ค้นหาข้อมูลครูผู้สอน
  const teacher = teachers.find(t => t.user_id === teacherId);
  if (!teacher) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลครูผู้สอน',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // ฟอร์แมตวันที่เข้าสู่ระบบล่าสุด
  let lastLogin = '-';
  if (teacher.last_login) {
    try {
      const date = new Date(teacher.last_login);
      lastLogin = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      lastLogin = teacher.last_login;
    }
  }
  
  // ฟอร์แมตวันที่สร้าง
  let createdAt = '-';
  if (teacher.created_at) {
    try {
      const date = new Date(teacher.created_at);
      createdAt = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      createdAt = teacher.created_at;
    }
  }
  
  // สร้าง HTML สำหรับแสดงข้อมูล
  const teacherInfoHtml = `
    <div style="text-align: left; max-height: 500px; overflow-y: auto;">
      ${teacher.profile_image ? 
        `<div style="text-align: center; margin-bottom: 20px;">
          <img src="${teacher.profile_image}" alt="รูปโปรไฟล์" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #ddd;">
        </div>` : 
        `<div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 120px; height: 120px; border-radius: 50%; background-color: #f0f0f0; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 3px solid #ddd;">
            <i class="fas fa-user" style="font-size: 50px; color: #ccc;"></i>
          </div>
        </div>`
      }
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
        <div>
          <p><strong>ชื่อผู้ใช้:</strong><br>${teacher.username || '-'}</p>
        </div>
        <div>
          <p><strong>ชื่อ-นามสกุล:</strong><br>${teacher.name || '-'}</p>
        </div>
        <div>
          <p><strong>อีเมล:</strong><br>${teacher.email || '-'}</p>
        </div>
        <div>
          <p><strong>เบอร์โทรศัพท์:</strong><br>${teacher.phone || '-'}</p>
        </div>
        <div>
          <p><strong>วันที่สร้างบัญชี:</strong><br>${createdAt}</p>
        </div>
        <div>
          <p><strong>เข้าสู่ระบบล่าสุด:</strong><br>${lastLogin}</p>
        </div>
        <div style="grid-column: span 2;">
          <p><strong>บทบาท:</strong><br>ครูผู้สอน</p>
        </div>
      </div>
      
      <!-- แสดงรายวิชาที่สอน -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <h4 style="margin-bottom: 10px; color: #333;">รายวิชาที่รับผิดชอบ:</h4>
        <div id="teacher-subjects-list">
          <p style="color: #666; font-style: italic;">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    </div>
  `;
  
  // แสดงรายละเอียดใน SweetAlert
  Swal.fire({
    title: 'ข้อมูลครูผู้สอน',
    html: teacherInfoHtml,
    width: 700,
    confirmButtonText: 'ปิด',
    customClass: {
      popup: 'teacher-detail-popup'
    },
    didOpen: () => {
      // โหลดรายวิชาที่ครูสอน
      loadTeacherSubjectsForView(teacherId);
    }
  });
}

function loadTeacherSubjectsForView(teacherId) {
  console.log('Loading teacher subjects for view, teacherId:', teacherId);
  console.log('Current data state:', {
    assignments: assignments ? assignments.length : 0,
    subjects: subjects ? subjects.length : 0,
    classes: classes ? classes.length : 0
  });
  
  // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบหรือไม่
  const needToLoadAssignments = !assignments || assignments.length === 0;
  const needToLoadSubjects = !subjects || subjects.length === 0;
  const needToLoadClasses = !classes || classes.length === 0;
  
  if (needToLoadAssignments || needToLoadSubjects || needToLoadClasses) {
    // โหลดข้อมูลที่ขาดหายไป
    const promises = [];
    
    if (needToLoadAssignments) {
      promises.push(
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .getAssignments(sessionId);
        })
      );
    } else {
      promises.push(Promise.resolve({ assignments: assignments }));
    }
    
    if (needToLoadSubjects) {
      promises.push(
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .getSubjects(sessionId);
        })
      );
    } else {
      promises.push(Promise.resolve({ subjects: subjects }));
    }
    
    if (needToLoadClasses) {
      promises.push(
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .getClasses(sessionId);
        })
      );
    } else {
      promises.push(Promise.resolve({ classes: classes }));
    }
    
    Promise.all(promises).then(results => {
      // อัปเดตตัวแปรโกลบอล
      if (needToLoadAssignments && results[0].status === 'success') {
        assignments = results[0].assignments || [];
      }
      if (needToLoadSubjects && results[1].status === 'success') {
        subjects = results[1].subjects || [];
      }
      if (needToLoadClasses && results[2].status === 'success') {
        classes = results[2].classes || [];
      }
      
      console.log('Data loaded successfully:', {
        assignments: assignments.length,
        subjects: subjects.length,
        classes: classes.length
      });
      
      // แสดงข้อมูล
      displayTeacherSubjects(teacherId);
      
    }).catch(error => {
      console.error('Error loading teacher subjects data:', error);
      const subjectsList = document.getElementById('teacher-subjects-list');
      if (subjectsList) {
        subjectsList.innerHTML = '<p style="color: #e74c3c;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
      }
    });
  } else {
    // มีข้อมูลครบแล้ว แสดงเลย
    displayTeacherSubjects(teacherId);
  }
}

function displayTeacherSubjects(teacherId) {
  const teacherAssignments = assignments.filter(assignment => assignment.teacher_id === teacherId);
  const subjectsList = document.getElementById('teacher-subjects-list');
  
  if (!subjectsList) {
    return; // ถ้าไม่พบ element
  }
  
  if (teacherAssignments.length === 0) {
    subjectsList.innerHTML = '<p style="color: #666; font-style: italic;">ยังไม่มีการมอบหมายรายวิชา</p>';
    return;
  }
  
  // ตรวจสอบว่ามีข้อมูล subjects และ classes หรือไม่
  if (!subjects || subjects.length === 0 || !classes || classes.length === 0) {
    subjectsList.innerHTML = '<p style="color: #e74c3c;">ไม่สามารถแสดงรายละเอียดได้ กรุณาโหลดข้อมูลอีกครั้ง</p>';
    return;
  }
  
  let subjectsHtml = '<div style="display: grid; gap: 10px;">';
  
  teacherAssignments.forEach(assignment => {
    // หาข้อมูลรายวิชา
    const subject = subjects.find(s => s.subject_id === assignment.subject_id);
    const classObj = classes.find(c => c.class_id === assignment.class_id);
    
    const subjectName = subject ? subject.name : 'ไม่พบข้อมูลรายวิชา';
    const subjectCode = subject ? subject.code : '-';
    const className = classObj ? classObj.name : 'ไม่พบข้อมูลชั้นเรียน';
    const subjectType = subject ? subject.type : '-';
    
    // กำหนดสีตามประเภทวิชา
    let badgeColor = '#3498db';
    if (subjectType === 'เพิ่มเติม') badgeColor = '#2ecc71';
    else if (subjectType === 'เลือกเสรี') badgeColor = '#9b59b6';
    else if (subjectType === 'กิจกรรมพัฒนาผู้เรียน') badgeColor = '#f1c40f';
    
    subjectsHtml += `
      <div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid ${badgeColor};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${subjectCode} - ${subjectName}</strong><br>
            <span style="color: #666; font-size: 0.9em;">ชั้น: ${className}</span>
          </div>
          <span style="background-color: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
            ${subjectType}
          </span>
        </div>
      </div>
    `;
  });
  
  subjectsHtml += '</div>';
  subjectsList.innerHTML = subjectsHtml;
}

function showTeacherModal(isEdit = false) {
  document.getElementById('teacher-modal-title').textContent = isEdit ? 'แก้ไขครูผู้สอน' : 'เพิ่มครูผู้สอน';
  document.getElementById('teacher-form').reset();
  document.getElementById('teacher-id').value = '';
  
  // ซ่อนตัวอย่างรูป
  document.getElementById('teacher-image-preview').style.display = 'none';
  
  // เพิ่ม event listener สำหรับตัวอย่างรูป
  const imageInput = document.getElementById('teacher-profile-image');
  const imagePreview = document.getElementById('teacher-image-preview');
  const previewImg = document.getElementById('teacher-preview-img');
  
  if (imageInput && imagePreview && previewImg) {
    // ลบ event listener เดิม (ถ้ามี) เพื่อป้องกันการซ้ำซ้อน
    const newImageInput = imageInput.cloneNode(true);
    imageInput.parentNode.replaceChild(newImageInput, imageInput);
    
    newImageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.match('image.*')) {
          Swal.fire({
            icon: 'warning',
            title: 'ไฟล์ไม่ถูกต้อง',
            text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
            confirmButtonText: 'ตกลง'
          });
          e.target.value = '';
          imagePreview.style.display = 'none';
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire({
            icon: 'warning',
            title: 'ไฟล์ขนาดใหญ่เกินไป',
            text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
            confirmButtonText: 'ตกลง'
          });
          e.target.value = '';
          imagePreview.style.display = 'none';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        imagePreview.style.display = 'none';
      }
    });
  }
  
  // แสดง modal
  document.getElementById('teacher-modal-overlay').classList.add('active');
}

function saveTeacher() {
  const teacherId = document.getElementById('teacher-id').value;
  const teacherData = {
    username: document.getElementById('teacher-username').value,
    name: document.getElementById('teacher-name').value,
    email: document.getElementById('teacher-email').value,
    phone: document.getElementById('teacher-phone').value, // เพิ่มฟิลด์ใหม่
    password: document.getElementById('teacher-password').value // เพิ่มฟิลด์ใหม่
  };
  const profileImageFile = document.getElementById('teacher-profile-image').files[0];
  
  if (!teacherData.username || !teacherData.name || !teacherData.email) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดระบุชื่อผู้ใช้, ชื่อ-นามสกุล และอีเมล',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // ฟังก์ชันสำหรับบันทึกข้อมูลครู
  const saveTeacherData = function(imageUrl) {
    if (imageUrl) {
      teacherData.profile_image = imageUrl;
    }
    
    if (teacherId) {
      // แก้ไขครูผู้สอน
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            document.getElementById('teacher-modal-overlay').classList.remove('active');
            loadTeachers();
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'แก้ไขครูผู้สอนเรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถแก้ไขครูผู้สอนได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .updateTeacher(sessionId, teacherId, teacherData);
    } else {
      // เพิ่มครูผู้สอนใหม่
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            document.getElementById('teacher-modal-overlay').classList.remove('active');
            loadTeachers();
            
            const passwordMessage = response.initialPassword ? 
              `<br><br>รหัสผ่านเริ่มต้น: <strong>${response.initialPassword}</strong>` : '';
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              html: `เพิ่มครูผู้สอนเรียบร้อยแล้ว${passwordMessage}<br><br>กรุณาแจ้งรหัสผ่านนี้ให้ครูผู้สอนทราบ`,
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเพิ่มครูผู้สอนได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .addTeacher(sessionId, teacherData);
    }
  };
  
  // ถ้ามีรูปภาพ ให้อัปโหลดก่อน
  if (profileImageFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const imageDataUrl = e.target.result;
      const fileName = 'teacher_' + teacherData.username + '_' + new Date().getTime() + '_' + profileImageFile.name;
      
      google.script.run
        .withSuccessHandler(function(uploadResult) {
          if (uploadResult.status === 'success') {
            saveTeacherData(uploadResult.imageUrl);
          } else {
            document.getElementById('loading-spinner').classList.add('hidden');
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + uploadResult.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .uploadTeacherImage(sessionId, imageDataUrl, fileName);
    };
    
    reader.readAsDataURL(profileImageFile);
  } else {
    // ไม่มีรูปภาพ บันทึกข้อมูลเลย
    saveTeacherData();
  }
}

function editTeacher(teacherId) {
  // ค้นหาข้อมูลครูผู้สอน
  const teacher = teachers.find(t => t.user_id === teacherId);
  if (!teacher) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลครูผู้สอน',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // เปิด modal แก้ไข
  document.getElementById('teacher-id').value = teacherId;
  document.getElementById('teacher-username').value = teacher.username;
  document.getElementById('teacher-name').value = teacher.name;
  document.getElementById('teacher-email').value = teacher.email;
  document.getElementById('teacher-phone').value = teacher.phone || '';
  document.getElementById('teacher-password').value = ''; // ไม่แสดงรหัสผ่านเดิม
  
  // แสดงรูปโปรไฟล์เดิม (ถ้ามี)
  const currentImageDiv = document.getElementById('teacher-current-image');
  const currentImg = document.getElementById('teacher-current-img');
  const imagePreview = document.getElementById('teacher-image-preview');
  
  if (teacher.profile_image) {
    currentImg.src = teacher.profile_image;
    currentImageDiv.style.display = 'block';
  } else {
    currentImageDiv.style.display = 'none';
  }
  
  // ซ่อนตัวอย่างรูปใหม่
  imagePreview.style.display = 'none';
  
  // เคลียร์ไฟล์ที่เลือก
  document.getElementById('teacher-profile-image').value = '';
  
  document.getElementById('teacher-modal-title').textContent = 'แก้ไขครูผู้สอน';
  
  // เรียกใช้ showTeacherModal เพื่อตั้งค่า event listeners
  showTeacherModal(true);
  
  // ตั้งค่าข้อมูลหลังจากเปิด modal แล้ว
  setTimeout(() => {
    document.getElementById('teacher-id').value = teacherId;
    document.getElementById('teacher-username').value = teacher.username;
    document.getElementById('teacher-name').value = teacher.name;
    document.getElementById('teacher-email').value = teacher.email;
    document.getElementById('teacher-phone').value = teacher.phone || '';
    
    if (teacher.profile_image) {
      currentImg.src = teacher.profile_image;
      currentImageDiv.style.display = 'block';
    }
  }, 100);
}

function resetPassword(userId, userName) {
  // แสดง modal ยืนยันการรีเซ็ตรหัสผ่าน
  document.getElementById('reset-user-id').value = userId;
  document.getElementById('reset-user-name').textContent = userName;
  document.getElementById('reset-password-info').classList.remove('hidden');
  document.getElementById('reset-password-result').classList.add('hidden');
  document.getElementById('reset-password-confirm-buttons').classList.remove('hidden');
  document.getElementById('reset-password-close-button').classList.add('hidden');
  document.getElementById('reset-password-modal-overlay').classList.add('active');
}

function confirmResetPassword() {
  const userId = document.getElementById('reset-user-id').value;
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        // แสดงผลลัพธ์
        document.getElementById('reset-password-info').classList.add('hidden');
        document.getElementById('reset-password-result').classList.remove('hidden');
        document.getElementById('reset-user-name-result').textContent = document.getElementById('reset-user-name').textContent;
        document.getElementById('new-password').textContent = response.newPassword;
        document.getElementById('reset-password-confirm-buttons').classList.add('hidden');
        document.getElementById('reset-password-close-button').classList.remove('hidden');
      } else {
        document.getElementById('reset-password-modal-overlay').classList.remove('active');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: response.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      document.getElementById('reset-password-modal-overlay').classList.remove('active');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถรีเซ็ตรหัสผ่านได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .resetTeacherPassword(sessionId, userId);
}

function deleteTeacher(teacherId) {
  Swal.fire({
    title: 'ยืนยันการลบ',
    text: "คุณแน่ใจหรือไม่ที่จะลบครูผู้สอนคนนี้?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // แสดงหน้าโหลด
      document.getElementById('loading-spinner').classList.remove('hidden');
      
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            // โหลดข้อมูลครูผู้สอนใหม่
            loadTeachers();
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'ลบครูผู้สอนเรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถลบครูผู้สอนได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .deleteTeacher(sessionId, teacherId);
    }
  });
}

// ปรับปรุงฟังก์ชัน showStudentsSection
function showStudentsSection() {
  hideAllSections();
  document.getElementById('students-content').classList.remove('hidden');
  setActiveMenuItem('menu-students');
  
  // รีเซ็ตการค้นหา
  currentSearchTerm = '';
  currentClassFilter = '';
  document.getElementById('search-student').value = '';
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลระดับชั้นก่อนเสมอ
  loadClassesForStudents();
}

// ฟังก์ชันโหลดข้อมูลระดับชั้นสำหรับหน้านักเรียน (ปรับปรุง)
function loadClassesForStudents() {
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      if (results.status === 'success') {
        classes = results.classes || [];
        populateClassSelect();
        
        // หลังจากโหลดระดับชั้นแล้ว ให้โหลดข้อมูลนักเรียน
        loadStudents();
      } else {
        document.getElementById('loading-spinner').classList.add('hidden');
        
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลระดับชั้นได้: ' + results.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลระดับชั้นได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getClasses(sessionId);
}

function populateClassSelect() {
  const classesContainer = document.getElementById('classes-selection');
  const filterClassSelect = document.getElementById('filter-assignment-class');
  const studentClassSelect = document.getElementById('student-class');
  const filterStudentClassSelect = document.getElementById('filter-class');
  
  // สำหรับ Assignment form - สร้าง checkbox list
  if (classesContainer) {
    classesContainer.innerHTML = '';
    
    if (classes.length === 0) {
      classesContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">ไม่พบข้อมูลระดับชั้น</p>';
      return;
    }
    
    classes.forEach(classObj => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'class-checkbox-item';
      checkboxItem.onclick = function() {
        const checkbox = this.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        updateClassSelection();
        updateAssignmentSummary();
      };
      
      checkboxItem.innerHTML = `
        <input type="checkbox" value="${classObj.class_id}" onclick="event.stopPropagation(); updateClassSelection(); updateAssignmentSummary();">
        <div class="class-info">
          <div class="class-name">${classObj.name}</div>
          <div class="class-details">${classObj.student_count || 0} นักเรียน</div>
        </div>
        <i class="fas fa-school class-icon"></i>
      `;
      
      classesContainer.appendChild(checkboxItem);
    });
  }
  
  // สำหรับ Assignment filter - dropdown ปกติ
  if (filterClassSelect) {
    filterClassSelect.innerHTML = '<option value="">ทั้งหมด</option>';
    classes.forEach(cls => {
      filterClassSelect.innerHTML += `<option value="${cls.class_id}">${cls.name}</option>`;
    });
  }
  
  // Student form
  if (studentClassSelect) {
    studentClassSelect.innerHTML = '<option value="">-- เลือกระดับชั้น --</option>';
    classes.forEach(cls => {
      studentClassSelect.innerHTML += `<option value="${cls.class_id}">${cls.name}</option>`;
    });
  }
  
  // Student filter
  if (filterStudentClassSelect) {
    filterStudentClassSelect.innerHTML = '<option value="">ทั้งหมด</option>';
    classes.forEach(cls => {
      filterStudentClassSelect.innerHTML += `<option value="${cls.class_id}">${cls.name}</option>`;
    });
  }
}

// ฟังก์ชันอัปเดตการเลือกระดับชั้น
function updateClassSelection() {
  const checkboxes = document.querySelectorAll('#classes-selection input[type="checkbox"]:checked');
  const selectedInfo = document.getElementById('selected-classes-info');
  const selectedList = document.getElementById('selected-classes-list');
  
  // อัปเดตสไตล์ของ checkbox items
  document.querySelectorAll('.class-checkbox-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox.checked) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  if (checkboxes.length > 0) {
    selectedInfo.style.display = 'block';
    selectedList.innerHTML = '';
    
    checkboxes.forEach(checkbox => {
      const classObj = classes.find(c => c.class_id === checkbox.value);
      if (classObj) {
        const tag = document.createElement('span');
        tag.className = 'selected-class-tag';
        tag.innerHTML = `
          ${classObj.name}
          <span class="remove-class" onclick="removeClassSelection('${classObj.class_id}')">&times;</span>
        `;
        selectedList.appendChild(tag);
      }
    });
  } else {
    selectedInfo.style.display = 'none';
  }
}

// ฟังก์ชันลบการเลือกระดับชั้น
function removeClassSelection(classId) {
  const checkbox = document.querySelector(`#classes-selection input[value="${classId}"]`);
  if (checkbox) {
    checkbox.checked = false;
    updateClassSelection();
    updateAssignmentSummary();
  }
}

function loadStudents(classId) {
  // ถ้ายังไม่มีข้อมูลระดับชั้น ให้โหลดก่อน
  if (classes.length === 0) {
    loadClassesForStudents();
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (results.status === 'success') {
        allStudents = results.students || []; // เก็บข้อมูลทั้งหมด
        students = allStudents; // กำหนดค่าเริ่มต้น
        
        // อัปเดตตัวกรองระดับชั้น
        currentClassFilter = classId || '';
        document.getElementById('filter-class').value = currentClassFilter;
        
        // ทำการกรองและแสดงผล
        filterAndSearchStudents();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + results.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getStudents(sessionId, null); // โหลดข้อมูลทั้งหมดแล้วค่อยกรอง
}

// ฟังก์ชันค้นหาและกรองนักเรียน
function filterAndSearchStudents() {
  let result = allStudents;
  
  // กรองตามระดับชั้น
  if (currentClassFilter) {
    result = result.filter(student => student.class_id === currentClassFilter);
  }
  
  // ค้นหาตามคำค้นหา
  if (currentSearchTerm) {
    const searchLower = currentSearchTerm.toLowerCase();
    result = result.filter(student => {
      return (
        (student.student_id && student.student_id.toLowerCase().includes(searchLower)) ||
        (student.name && student.name.toLowerCase().includes(searchLower)) ||
        (student.id_card && student.id_card.includes(searchLower)) ||
        (student.phone && student.phone.includes(searchLower)) ||
        (student.father_name && student.father_name.toLowerCase().includes(searchLower)) ||
        (student.mother_name && student.mother_name.toLowerCase().includes(searchLower)) ||
        (student.guardian_name && student.guardian_name.toLowerCase().includes(searchLower))
      );
    });
  }
  
  filteredStudents = result;
  students = filteredStudents; // อัปเดตตัวแปร students เพื่อใช้ในการแสดงผล
  
  // แสดงผลลัพธ์การค้นหา
  updateSearchResultsInfo();
  
  // แสดงตาราง
  renderStudentsTable();
}

// ฟังก์ชันอัปเดตข้อมูลผลการค้นหา
function updateSearchResultsInfo() {
  const searchResultsInfo = document.getElementById('search-results-info');
  const searchResultsText = document.getElementById('search-results-text');
  
  if (currentSearchTerm || currentClassFilter) {
    let infoText = `แสดงผล ${filteredStudents.length} รายการ จากทั้งหมด ${allStudents.length} รายการ`;
    
    if (currentSearchTerm && currentClassFilter) {
      // หาชื่อระดับชั้น
      const classObj = classes.find(cls => cls.class_id === currentClassFilter);
      const className = classObj ? classObj.name : currentClassFilter;
      infoText += ` (ค้นหา: "${currentSearchTerm}" ในระดับชั้น: ${className})`;
    } else if (currentSearchTerm) {
      infoText += ` (ค้นหา: "${currentSearchTerm}")`;
    } else if (currentClassFilter) {
      const classObj = classes.find(cls => cls.class_id === currentClassFilter);
      const className = classObj ? classObj.name : currentClassFilter;
      infoText += ` (ระดับชั้น: ${className})`;
    }
    
    searchResultsText.textContent = infoText;
    searchResultsInfo.classList.remove('hidden');
  } else {
    searchResultsInfo.classList.add('hidden');
  }
}

// ฟังก์ชันล้างการค้นหา
function clearSearch() {
  currentSearchTerm = '';
  currentClassFilter = '';
  
  // ล้างช่องค้นหาและตัวกรอง
  document.getElementById('search-student').value = '';
  document.getElementById('filter-class').value = '';
  
  // แสดงข้อมูลทั้งหมด
  filterAndSearchStudents();
}

// ฟังก์ชันจัดการการค้นหา
function handleStudentSearch() {
  const searchInput = document.getElementById('search-student');
  currentSearchTerm = searchInput.value.trim();
  filterAndSearchStudents();
}

// ฟังก์ชันจัดการการกรองตามระดับชั้น
function filterStudentsByClass() {
  const classSelect = document.getElementById('filter-class');
  currentClassFilter = classSelect.value;
  filterAndSearchStudents();
}

function renderStudentsTable() {
  const tableBody = document.getElementById('students-table-body');
  tableBody.innerHTML = '';
  
  if (students.length === 0) {
    const message = currentSearchTerm || currentClassFilter ? 
      'ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไขการค้นหา' : 
      'ไม่พบข้อมูลนักเรียน';
      
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">${message}</td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  students.forEach(student => {
    // หาชื่อระดับชั้น
    let className = '-';
    if (classes.length > 0) {
      const classObj = classes.find(cls => cls.class_id === student.class_id);
      if (classObj) {
        className = classObj.name;
      }
    } else {
      className = student.class_id || '-';
    }
    
    // ฟังก์ชันไฮไลต์คำค้นหา
    const highlightText = (text, searchTerm) => {
      if (!text || !searchTerm) return text || '';
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark style="background-color: #ffeb3b; padding: 1px 2px;">$1</mark>');
    };
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center;">
          ${student.profile_image ? 
            `<img src="${student.profile_image}" alt="รูปโปรไฟล์" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; object-fit: cover;">` : 
            `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #f0f0f0; margin-right: 10px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: #ccc;"></i></div>`
          }
          <div>
            <div style="font-weight: bold;">${highlightText(student.student_id, currentSearchTerm)}</div>
            <div style="font-size: 0.8em; color: #666;">${highlightText(student.phone, currentSearchTerm)}</div>
          </div>
        </div>
      </td>
      <td>
        <div>
          <div style="font-weight: bold;">${highlightText(student.name, currentSearchTerm)}</div>
          <div style="font-size: 0.8em; color: #666;">
            ${highlightText([student.father_name, student.mother_name].filter(name => name).join(' / '), currentSearchTerm) || '-'}
          </div>
        </div>
      </td>
      <td>${highlightText(student.id_card, currentSearchTerm) || '-'}</td>
      <td>${className}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editStudent('${student.user_id}')" title="แก้ไข">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-info" onclick="viewStudent('${student.user_id}')" title="ดูรายละเอียด">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.user_id}')" title="ลบ">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  console.log('Students table rendered:', students.length, 'students (filtered from', allStudents.length, 'total)');
}



function viewStudent(studentId) {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(result) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (result.status === 'success') {
        const student = result.student;
        
        // หาชื่อระดับชั้น
        let className = '-';
        const classObj = classes.find(cls => cls.class_id === student.class_id);
        if (classObj) {
          className = classObj.name;
        }
        
        // ฟอร์แมตวันเกิด
        let birthDate = '-';
        if (student.birth_date) {
          try {
            const date = new Date(student.birth_date);
            birthDate = date.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } catch (e) {
            birthDate = student.birth_date;
          }
        }
        
        // สร้าง HTML สำหรับแสดงข้อมูล
        const studentInfoHtml = `
          <div style="text-align: left; max-height: 500px; overflow-y: auto;">
            ${student.profile_image ? 
              `<div style="text-align: center; margin-bottom: 20px;">
                <img src="${student.profile_image}" alt="รูปโปรไฟล์" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #ddd;">
              </div>` : 
              `<div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 120px; height: 120px; border-radius: 50%; background-color: #f0f0f0; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 3px solid #ddd;">
                  <i class="fas fa-user" style="font-size: 50px; color: #ccc;"></i>
                </div>
              </div>`
            }
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
              <div>
                <p><strong>รหัสนักเรียน:</strong><br>${student.student_id || '-'}</p>
              </div>
              <div>
                <p><strong>ชื่อ-นามสกุล:</strong><br>${student.name || '-'}</p>
              </div>
              <div>
                <p><strong>เลขประจำตัวประชาชน:</strong><br>${student.id_card || '-'}</p>
              </div>
              <div>
                <p><strong>วันเกิด:</strong><br>${birthDate}</p>
              </div>
              <div>
                <p><strong>ชื่อบิดา:</strong><br>${student.father_name || '-'}</p>
              </div>
              <div>
                <p><strong>ชื่อมารดา:</strong><br>${student.mother_name || '-'}</p>
              </div>
              <div>
                <p><strong>ชื่อผู้ปกครอง:</strong><br>${student.guardian_name || '-'}</p>
              </div>
              <div>
                <p><strong>เบอร์โทรศัพท์:</strong><br>${student.phone || '-'}</p>
              </div>
              <div style="grid-column: span 2;">
                <p><strong>ที่อยู่:</strong><br>${student.address || '-'}</p>
              </div>
              <div>
                <p><strong>ระดับชั้น:</strong><br>${className}</p>
              </div>
              <div>
                <p><strong>วันที่สร้างข้อมูล:</strong><br>${student.created_at ? formatDate(student.created_at) : '-'}</p>
              </div>
            </div>
          </div>
        `;
        
        // แสดงรายละเอียดใน SweetAlert
        Swal.fire({
          title: 'ข้อมูลนักเรียน',
          html: studentInfoHtml,
          width: 700,
          confirmButtonText: 'ปิด',
          customClass: {
            popup: 'student-detail-popup'
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: result.message || 'ไม่สามารถโหลดข้อมูลนักเรียนได้',
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
        confirmButtonText: 'ตกลง'
      });
    })
    .getStudentById(sessionId, studentId);
}


function showStudentModal(isEdit = false) {
  document.getElementById('student-modal-title').textContent = isEdit ? 'แก้ไขนักเรียน' : 'เพิ่มนักเรียน';
  document.getElementById('student-form').reset();
  document.getElementById('student-id').value = '';
  
  // แสดง modal
  document.getElementById('student-modal-overlay').classList.add('active');
}

// ฟังก์ชัน saveStudent ที่ปรับปรุงแล้ว
function saveStudent() {
  try {
    // ดึงค่าจากฟอร์มปัจจุบัน (ที่อาจมีปัญหา)
    const studentIdElement = document.getElementById('student-id');
    const studentIdNumberElement = document.getElementById('student-id-number');
    const studentIdCardElement = document.getElementById('student-idcard');
    const studentNameElement = document.getElementById('student-name');
    const studentClassElement = document.getElementById('student-class');
    
    // ดึงค่าที่กรอกไว้เพื่อเก็บไว้ใช้ในฟอร์มใหม่
    const studentId = studentIdElement ? studentIdElement.value || '' : '';
    const studentIdNumber = studentIdNumberElement ? studentIdNumberElement.value || '' : '';
    const studentIdCard = studentIdCardElement ? studentIdCardElement.value || '' : '';
    const studentName = studentNameElement ? studentNameElement.value || '' : '';
    const studentClass = studentClassElement ? studentClassElement.value || '' : '';
    
    console.log("ข้อมูลเดิมที่กรอก:", {
      "รหัสนักเรียน": studentIdNumber,
      "เลขประจำตัวประชาชน": studentIdCard,
      "ชื่อ-นามสกุล": studentName,
      "ระดับชั้น": studentClass
    });
    
    // ค้นหา modal body ที่จะใส่ฟอร์มใหม่
    const modalBody = document.querySelector('#student-modal-overlay .modal-body');
    if (!modalBody) {
      console.error("ไม่พบ modal body");
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่พบส่วนที่จะแสดงฟอร์ม กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // สร้างฟอร์มใหม่พร้อมฟิลด์เพิ่มเติม
    modalBody.innerHTML = `
      <form id="student-form-new">
        <input type="hidden" id="student-id-new" value="${studentId}">
        
        <!-- ข้อมูลพื้นฐาน -->
        <div class="form-group">
          <label for="student-id-number-new" class="form-label">รหัสนักเรียน *</label>
          <input type="text" id="student-id-number-new" class="form-control" value="${studentIdNumber}" required>
        </div>
        
        <div class="form-group">
          <label for="student-name-new" class="form-label">ชื่อ-นามสกุล *</label>
          <input type="text" id="student-name-new" class="form-control" value="${studentName}" required>
        </div>
        
        <div class="form-group">
          <label for="student-idcard-new" class="form-label">เลขประจำตัวประชาชน</label>
          <input type="text" id="student-idcard-new" class="form-control" value="${studentIdCard}">
        </div>
        
        <div class="form-group">
          <label for="student-birth-date-new" class="form-label">วันเกิด</label>
          <input type="date" id="student-birth-date-new" class="form-control">
        </div>
        
        <!-- ข้อมูลครอบครัว -->
        <div class="form-group">
          <label for="student-father-name-new" class="form-label">ชื่อบิดา</label>
          <input type="text" id="student-father-name-new" class="form-control">
        </div>
        
        <div class="form-group">
          <label for="student-mother-name-new" class="form-label">ชื่อมารดา</label>
          <input type="text" id="student-mother-name-new" class="form-control">
        </div>
        
        <div class="form-group">
          <label for="student-guardian-name-new" class="form-label">ชื่อผู้ปกครอง</label>
          <input type="text" id="student-guardian-name-new" class="form-control">
        </div>
        
        <!-- ข้อมูลติดต่อ -->
        <div class="form-group">
          <label for="student-phone-new" class="form-label">เบอร์โทรศัพท์</label>
          <input type="tel" id="student-phone-new" class="form-control">
        </div>
        
        <div class="form-group">
          <label for="student-address-new" class="form-label">ที่อยู่</label>
          <textarea id="student-address-new" class="form-control" rows="3"></textarea>
        </div>
        
        <!-- ระดับชั้น -->
        <div class="form-group">
          <label for="student-class-new" class="form-label">ระดับชั้น *</label>
          <select id="student-class-new" class="form-control" required>
            <option value="">-- เลือกระดับชั้น --</option>
            ${getClassOptions(studentClass)}
          </select>
        </div>
        
        <!-- อัปโหลดรูปโปรไฟล์ -->
        <div class="form-group">
          <label for="student-profile-image-new" class="form-label">รูปโปรไฟล์</label>
          <input type="file" id="student-profile-image-new" class="form-control" accept="image/*">
          <small class="text-muted">รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)</small>
        </div>
        
      </form>
    `;
    
    // เปลี่ยนปุ่มบันทึกให้เรียกฟังก์ชันใหม่
    const saveBtn = document.getElementById('save-student-btn');
    if (saveBtn) {
      // ลบ event listener เดิม
      const oldSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);
      
      // เพิ่ม event listener ใหม่
      oldSaveBtn.addEventListener('click', function() {
        processSaveStudentForm();
      });
    }
    
    // แจ้งให้ผู้ใช้ทราบว่าฟอร์มถูกสร้างใหม่
    Swal.fire({
      icon: 'info',
      title: 'ฟอร์มถูกสร้างใหม่',
      text: 'กรุณากรอกข้อมูลให้ครบถ้วนและบันทึกอีกครั้ง',
      confirmButtonText: 'ตกลง'
    });
    
    return;
    
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในฟังก์ชัน saveStudent:", error);
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'เกิดข้อผิดพลาดในการจัดการฟอร์ม: ' + (error.message || 'ไม่ทราบสาเหตุ'),
      confirmButtonText: 'ตกลง'
    });
  }
}

function getClassOptions(selectedClassId) {
  let options = '';
  try {
    // ถ้าไม่มีข้อมูลระดับชั้น ให้โหลดข้อมูล
    if (!classes || classes.length === 0) {
      if (selectedClassId) {
        options += `<option value="${selectedClassId}" selected>กำลังโหลดข้อมูล...</option>`;
      }
      // เรียกโหลดข้อมูลระดับชั้น
      setTimeout(() => {
        if (classes.length === 0) {
          loadClassesForStudents();
        }
      }, 100);
    } else {
      // ถ้ามีข้อมูลระดับชั้น ให้สร้างตัวเลือก
      classes.forEach(cls => {
        const selected = cls.class_id === selectedClassId ? 'selected' : '';
        options += `<option value="${cls.class_id}" ${selected}>${cls.name}</option>`;
      });
    }
  } catch (e) {
    console.error("Error creating class options:", e);
    if (selectedClassId) {
      options += `<option value="${selectedClassId}" selected>กำลังโหลดข้อมูล...</option>`;
    }
  }
  return options;
}

function ensureClassesLoaded(callback) {
  if (classes.length === 0) {
    console.log('Loading classes data...');
    google.script.run
      .withSuccessHandler(function(results) {
        if (results.status === 'success') {
          classes = results.classes || [];
          console.log('Classes loaded:', classes.length);
          if (callback && typeof callback === 'function') {
            callback();
          }
        }
      })
      .withFailureHandler(function(error) {
        console.error('Failed to load classes:', error);
        if (callback && typeof callback === 'function') {
          callback();
        }
      })
      .getClasses(sessionId);
  } else {
    console.log('Classes already loaded:', classes.length);
    if (callback && typeof callback === 'function') {
      callback();
    }
  }
}

// ปรับปรุงฟังก์ชัน processSaveStudentForm
function processSaveStudentForm() {
  try {
    // ดึงค่าจากฟอร์มใหม่
    const studentIdElement = document.getElementById('student-id-new');
    const studentIdNumberElement = document.getElementById('student-id-number-new');
    const studentIdCardElement = document.getElementById('student-idcard-new');
    const studentNameElement = document.getElementById('student-name-new');
    const studentBirthDateElement = document.getElementById('student-birth-date-new');
    const studentFatherNameElement = document.getElementById('student-father-name-new');
    const studentMotherNameElement = document.getElementById('student-mother-name-new');
    const studentGuardianNameElement = document.getElementById('student-guardian-name-new');
    const studentPhoneElement = document.getElementById('student-phone-new');
    const studentAddressElement = document.getElementById('student-address-new');
    const studentClassElement = document.getElementById('student-class-new');
    const studentProfileImageElement = document.getElementById('student-profile-image-new');
    
    // ตรวจสอบว่าฟิลด์ที่จำเป็นมีอยู่ครบ
    if (!studentIdNumberElement || !studentNameElement || !studentClassElement) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่พบฟิลด์ที่จำเป็นในฟอร์มใหม่',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // อ่านค่าจากฟอร์ม
    const studentId = studentIdElement ? studentIdElement.value || '' : '';
    const studentIdNumber = studentIdNumberElement.value || '';
    const studentIdCard = studentIdCardElement ? studentIdCardElement.value || '' : '';
    const studentName = studentNameElement.value || '';
    const studentBirthDate = studentBirthDateElement ? studentBirthDateElement.value || '' : '';
    const studentFatherName = studentFatherNameElement ? studentFatherNameElement.value || '' : '';
    const studentMotherName = studentMotherNameElement ? studentMotherNameElement.value || '' : '';
    const studentGuardianName = studentGuardianNameElement ? studentGuardianNameElement.value || '' : '';
    const studentPhone = studentPhoneElement ? studentPhoneElement.value || '' : '';
    const studentAddress = studentAddressElement ? studentAddressElement.value || '' : '';
    const studentClass = studentClassElement.value || '';
    const profileImageFile = studentProfileImageElement ? studentProfileImageElement.files[0] : null;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!studentIdNumber) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกรหัสนักเรียน',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (!studentName) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกชื่อ-นามสกุล',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (!studentClass) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกระดับชั้น',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // ตรวจสอบไฟล์รูปภาพ (ถ้ามี)
    if (profileImageFile) {
      if (!profileImageFile.type.match('image.*')) {
        Swal.fire({
          icon: 'warning',
          title: 'ไฟล์ไม่ถูกต้อง',
          text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
          confirmButtonText: 'ตกลง'
        });
        return;
      }
      
      if (profileImageFile.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'ไฟล์ขนาดใหญ่เกินไป',
          text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
          confirmButtonText: 'ตกลง'
        });
        return;
      }
    }
    
    // สร้าง object ข้อมูลนักเรียน
    const studentData = {
      student_id: studentIdNumber,
      id_card: studentIdCard,
      name: studentName,
      birth_date: studentBirthDate,
      father_name: studentFatherName,
      mother_name: studentMotherName,
      guardian_name: studentGuardianName,
      phone: studentPhone,
      address: studentAddress,
      class_id: studentClass
    };
    
    // แสดงหน้าโหลด
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
      loadingElement.classList.remove('hidden');
    }
    
    // ฟังก์ชันสำหรับบันทึกข้อมูลนักเรียน
    const saveStudentData = function(imageUrl) {
      if (imageUrl) {
        studentData.profile_image = imageUrl;
      }
      
      if (studentId) {
        // แก้ไขนักเรียน
        google.script.run
          .withSuccessHandler(function(response) {
            if (loadingElement) {
              loadingElement.classList.add('hidden');
            }
            
            if (response.status === 'success') {
              // ปิด modal
              const modalElement = document.getElementById('student-modal-overlay');
              if (modalElement) {
                modalElement.classList.remove('active');
              }
              
              // โหลดข้อมูลนักเรียนใหม่
              const filterElement = document.getElementById('filter-class');
              loadStudents(filterElement ? filterElement.value : '');
              
              Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'แก้ไขนักเรียนเรียบร้อยแล้ว',
                confirmButtonText: 'ตกลง'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถแก้ไขข้อมูลได้',
                confirmButtonText: 'ตกลง'
              });
            }
          })
          .withFailureHandler(function(error) {
            if (loadingElement) {
              loadingElement.classList.add('hidden');
            }
            
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ไม่สามารถแก้ไขนักเรียนได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
              confirmButtonText: 'ตกลง'
            });
          })
          .updateStudent(sessionId, studentId, studentData);
      } else {
        // เพิ่มนักเรียนใหม่
        google.script.run
          .withSuccessHandler(function(response) {
            if (loadingElement) {
              loadingElement.classList.add('hidden');
            }
            
            if (response.status === 'success') {
              // ปิด modal
              const modalElement = document.getElementById('student-modal-overlay');
              if (modalElement) {
                modalElement.classList.remove('active');
              }
              
              // โหลดข้อมูลนักเรียนใหม่
              const filterElement = document.getElementById('filter-class');
              loadStudents(filterElement ? filterElement.value : '');
              
              Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'เพิ่มนักเรียนเรียบร้อยแล้ว',
                confirmButtonText: 'ตกลง'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถเพิ่มข้อมูลได้',
                confirmButtonText: 'ตกลง'
              });
            }
          })
          .withFailureHandler(function(error) {
            if (loadingElement) {
              loadingElement.classList.add('hidden');
            }
            
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ไม่สามารถเพิ่มนักเรียนได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
              confirmButtonText: 'ตกลง'
            });
          })
          .addStudent(sessionId, studentData);
      }
    };
    
    // ถ้ามีรูปภาพ ให้อัปโหลดก่อน
    if (profileImageFile) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        const fileName = 'student_' + studentIdNumber + '_' + new Date().getTime() + '_' + profileImageFile.name;
        
        // ตรวจสอบโฟลเดอร์โปรไฟล์ก่อน
        google.script.run
          .withSuccessHandler(function(folderResult) {
            if (folderResult.status === 'success') {
              // อัปโหลดรูปภาพ
              google.script.run
                .withSuccessHandler(function(uploadResult) {
                  if (uploadResult.status === 'success') {
                    saveStudentData(uploadResult.imageUrl);
                  } else {
                    if (loadingElement) {
                      loadingElement.classList.add('hidden');
                    }
                    
                    Swal.fire({
                      icon: 'error',
                      title: 'เกิดข้อผิดพลาด',
                      text: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + uploadResult.message,
                      confirmButtonText: 'ตกลง'
                    });
                  }
                })
                .withFailureHandler(function(error) {
                  if (loadingElement) {
                    loadingElement.classList.add('hidden');
                  }
                  
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
                    confirmButtonText: 'ตกลง'
                  });
                })
                .uploadStudentImage(sessionId, imageDataUrl, fileName);
            } else {
              if (loadingElement) {
                loadingElement.classList.add('hidden');
              }
              
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเข้าถึงโฟลเดอร์โปรไฟล์ได้: ' + folderResult.message,
                confirmButtonText: 'ตกลง'
              });
            }
          })
          .withFailureHandler(function(error) {
            if (loadingElement) {
              loadingElement.classList.add('hidden');
            }
            
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ไม่สามารถตรวจสอบโฟลเดอร์โปรไฟล์ได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
              confirmButtonText: 'ตกลง'
            });
          })
          .checkAndCreateProfileFolder();
      };
      
      reader.readAsDataURL(profileImageFile);
    } else {
      // ไม่มีรูปภาพ บันทึกข้อมูลเลย
      saveStudentData();
    }
    
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในฟังก์ชัน processSaveStudentForm:", error);
    
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error.message || 'ไม่ทราบสาเหตุ'),
      confirmButtonText: 'ตกลง'
    });
  }
}

// ฟังก์ชันใหม่สำหรับอัปโหลดรูปโปรไฟล์นักเรียนแยกต่างหาก
function uploadStudentProfileImage(studentId) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  
  fileInput.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // ตรวจสอบไฟล์
    if (!file.type.match('image.*')) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ขนาดใหญ่เกินไป',
        text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // แสดงหน้าโหลด
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
      loadingElement.classList.remove('hidden');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const imageDataUrl = e.target.result;
      const fileName = 'student_profile_' + studentId + '_' + new Date().getTime() + '_' + file.name;
      
      google.script.run
        .withSuccessHandler(function(result) {
          if (loadingElement) {
            loadingElement.classList.add('hidden');
          }
          
          if (result.status === 'success') {
            // โหลดข้อมูลนักเรียนใหม่
            const filterElement = document.getElementById('filter-class');
            loadStudents(filterElement ? filterElement.value : '');
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: result.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          if (loadingElement) {
            loadingElement.classList.add('hidden');
          }
          
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
            confirmButtonText: 'ตกลง'
          });
        })
        .updateStudentProfileImage(sessionId, studentId, imageDataUrl, fileName);
    };
    
    reader.readAsDataURL(file);
  };
  
  fileInput.click();
}

function showStudentModal(isEdit = false) {
 document.getElementById('student-modal-title').textContent = isEdit ? 'แก้ไขนักเรียน' : 'เพิ่มนักเรียน';
 
 // ค้นหา modal body
 const modalBody = document.querySelector('#student-modal-overlay .modal-body');
 if (modalBody) {
   // สร้างฟอร์มใหม่พร้อมฟิลด์เพิ่มเติม
   modalBody.innerHTML = `
     <form id="student-form-new">
       <input type="hidden" id="student-id-new" value="">
       
       <!-- ข้อมูลพื้นฐาน -->
       <div class="form-group">
         <label for="student-id-number-new" class="form-label">รหัสนักเรียน *</label>
         <input type="text" id="student-id-number-new" class="form-control" required>
       </div>
       
       <div class="form-group">
         <label for="student-name-new" class="form-label">ชื่อ-นามสกุล *</label>
         <input type="text" id="student-name-new" class="form-control" required>
       </div>
       
       <div class="form-group">
         <label for="student-idcard-new" class="form-label">เลขประจำตัวประชาชน</label>
         <input type="text" id="student-idcard-new" class="form-control" maxlength="13">
       </div>
       
       <div class="form-group">
         <label for="student-birth-date-new" class="form-label">วันเกิด</label>
         <input type="date" id="student-birth-date-new" class="form-control">
       </div>
       
       <!-- ข้อมูลครอบครัว -->
       <div class="form-group">
         <label for="student-father-name-new" class="form-label">ชื่อบิดา</label>
         <input type="text" id="student-father-name-new" class="form-control">
       </div>
       
       <div class="form-group">
         <label for="student-mother-name-new" class="form-label">ชื่อมารดา</label>
         <input type="text" id="student-mother-name-new" class="form-control">
       </div>
       
       <div class="form-group">
         <label for="student-guardian-name-new" class="form-label">ชื่อผู้ปกครอง</label>
         <input type="text" id="student-guardian-name-new" class="form-control">
       </div>
       
       <!-- ข้อมูลติดต่อ -->
       <div class="form-group">
         <label for="student-phone-new" class="form-label">เบอร์โทรศัพท์</label>
         <input type="tel" id="student-phone-new" class="form-control" placeholder="08XXXXXXXX">
       </div>
       
       <div class="form-group">
         <label for="student-address-new" class="form-label">ที่อยู่</label>
         <textarea id="student-address-new" class="form-control" rows="3" placeholder="ที่อยู่ปัจจุบัน"></textarea>
       </div>
       
       <!-- ระดับชั้น -->
       <div class="form-group">
         <label for="student-class-new" class="form-label">ระดับชั้น *</label>
         <select id="student-class-new" class="form-control" required>
           <option value="">-- เลือกระดับชั้น --</option>
           ${getClassOptions('')}
         </select>
       </div>
       
       <!-- อัปโหลดรูปโปรไฟล์ -->
       <div class="form-group">
         <label for="student-profile-image-new" class="form-label">รูปโปรไฟล์</label>
         <input type="file" id="student-profile-image-new" class="form-control" accept="image/*">
         <small class="text-muted">รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)</small>
         <div id="image-preview-new" style="margin-top: 10px; display: none;">
           <img id="preview-img-new" src="" alt="ตัวอย่างรูป" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
         </div>
       </div>
       
     </form>
   `;
   
   // เพิ่ม event listener สำหรับตัวอย่างรูป
   const imageInput = document.getElementById('student-profile-image-new');
   const imagePreview = document.getElementById('image-preview-new');
   const previewImg = document.getElementById('preview-img-new');
   
   if (imageInput && imagePreview && previewImg) {
     imageInput.addEventListener('change', function(e) {
       const file = e.target.files[0];
       if (file) {
         // ตรวจสอบประเภทไฟล์
         if (!file.type.match('image.*')) {
           Swal.fire({
             icon: 'warning',
             title: 'ไฟล์ไม่ถูกต้อง',
             text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
             confirmButtonText: 'ตกลง'
           });
           e.target.value = '';
           imagePreview.style.display = 'none';
           return;
         }
         
         // ตรวจสอบขนาดไฟล์
         if (file.size > 5 * 1024 * 1024) {
           Swal.fire({
             icon: 'warning',
             title: 'ไฟล์ขนาดใหญ่เกินไป',
             text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
             confirmButtonText: 'ตกลง'
           });
           e.target.value = '';
           imagePreview.style.display = 'none';
           return;
         }
         
         // แสดงตัวอย่างรูป
         const reader = new FileReader();
         reader.onload = function(e) {
           previewImg.src = e.target.result;
           imagePreview.style.display = 'block';
         };
         reader.readAsDataURL(file);
       } else {
         imagePreview.style.display = 'none';
       }
     });
   }
   
   // เปลี่ยนปุ่มบันทึกให้เรียกฟังก์ชันใหม่
   const saveBtn = document.getElementById('save-student-btn');
   if (saveBtn) {
     // ลบ event listener เดิม
     const oldSaveBtn = saveBtn.cloneNode(true);
     saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);
     
     // เพิ่ม event listener ใหม่
     oldSaveBtn.addEventListener('click', function() {
       processSaveStudentForm();
     });
   }
 }
 
 // แสดง modal
 document.getElementById('student-modal-overlay').classList.add('active');
}

function editStudent(studentId) {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 google.script.run
   .withSuccessHandler(function(result) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (result.status === 'success') {
       const student = result.student;
       
       // เปิด modal แก้ไข
       document.getElementById('student-modal-title').textContent = 'แก้ไขนักเรียน';
       
       // ค้นหา modal body
       const modalBody = document.querySelector('#student-modal-overlay .modal-body');
       if (modalBody) {
         // สร้างฟอร์มใหม่พร้อมกำหนดค่า
         modalBody.innerHTML = `
           <form id="student-form-new">
             <input type="hidden" id="student-id-new" value="${studentId}">
             
             <!-- ข้อมูลพื้นฐาน -->
             <div class="form-group">
               <label for="student-id-number-new" class="form-label">รหัสนักเรียน *</label>
               <input type="text" id="student-id-number-new" class="form-control" value="${student.student_id || ''}" required>
             </div>
             
             <div class="form-group">
               <label for="student-name-new" class="form-label">ชื่อ-นามสกุล *</label>
               <input type="text" id="student-name-new" class="form-control" value="${student.name || ''}" required>
             </div>
             
             <div class="form-group">
               <label for="student-idcard-new" class="form-label">เลขประจำตัวประชาชน</label>
               <input type="text" id="student-idcard-new" class="form-control" value="${student.id_card || ''}" maxlength="13">
             </div>
             
             <div class="form-group">
               <label for="student-birth-date-new" class="form-label">วันเกิด</label>
               <input type="date" id="student-birth-date-new" class="form-control" value="${student.birth_date || ''}">
             </div>
             
             <!-- ข้อมูลครอบครัว -->
             <div class="form-group">
               <label for="student-father-name-new" class="form-label">ชื่อบิดา</label>
               <input type="text" id="student-father-name-new" class="form-control" value="${student.father_name || ''}">
             </div>
             
             <div class="form-group">
               <label for="student-mother-name-new" class="form-label">ชื่อมารดา</label>
               <input type="text" id="student-mother-name-new" class="form-control" value="${student.mother_name || ''}">
             </div>
             
             <div class="form-group">
               <label for="student-guardian-name-new" class="form-label">ชื่อผู้ปกครอง</label>
               <input type="text" id="student-guardian-name-new" class="form-control" value="${student.guardian_name || ''}">
             </div>
             
             <!-- ข้อมูลติดต่อ -->
             <div class="form-group">
               <label for="student-phone-new" class="form-label">เบอร์โทรศัพท์</label>
               <input type="tel" id="student-phone-new" class="form-control" value="${student.phone || ''}" placeholder="08XXXXXXXX">
             </div>
             
             <div class="form-group">
               <label for="student-address-new" class="form-label">ที่อยู่</label>
               <textarea id="student-address-new" class="form-control" rows="3" placeholder="ที่อยู่ปัจจุบัน">${student.address || ''}</textarea>
             </div>
             
             <!-- ระดับชั้น -->
             <div class="form-group">
               <label for="student-class-new" class="form-label">ระดับชั้น *</label>
               <select id="student-class-new" class="form-control" required>
                 <option value="">-- เลือกระดับชั้น --</option>
                 ${getClassOptions(student.class_id || '')}
               </select>
             </div>
             
             <!-- รูปโปรไฟล์เดิม -->
             ${student.profile_image ? `
             <div class="form-group">
               <label class="form-label">รูปโปรไฟล์ปัจจุบัน</label>
               <div style="margin-bottom: 10px;">
                 <img src="${student.profile_image}" alt="รูปโปรไฟล์" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
               </div>
             </div>
             ` : ''}
             
             <!-- อัปโหลดรูปโปรไฟล์ใหม่ -->
             <div class="form-group">
               <label for="student-profile-image-new" class="form-label">${student.profile_image ? 'เปลี่ยนรูปโปรไฟล์' : 'รูปโปรไฟล์'}</label>
               <input type="file" id="student-profile-image-new" class="form-control" accept="image/*">
               <small class="text-muted">รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)</small>
               <div id="image-preview-new" style="margin-top: 10px; display: none;">
                 <img id="preview-img-new" src="" alt="ตัวอย่างรูป" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
               </div>
             </div>
             
           </form>
         `;
         
         // เพิ่ม event listener สำหรับตัวอย่างรูป
         const imageInput = document.getElementById('student-profile-image-new');
         const imagePreview = document.getElementById('image-preview-new');
         const previewImg = document.getElementById('preview-img-new');
         
         if (imageInput && imagePreview && previewImg) {
           imageInput.addEventListener('change', function(e) {
             const file = e.target.files[0];
             if (file) {
               // ตรวจสอบประเภทไฟล์
               if (!file.type.match('image.*')) {
                 Swal.fire({
                   icon: 'warning',
                   title: 'ไฟล์ไม่ถูกต้อง',
                   text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
                   confirmButtonText: 'ตกลง'
                 });
                 e.target.value = '';
                 imagePreview.style.display = 'none';
                 return;
               }
               
               // ตรวจสอบขนาดไฟล์
               if (file.size > 5 * 1024 * 1024) {
                 Swal.fire({
                   icon: 'warning',
                   title: 'ไฟล์ขนาดใหญ่เกินไป',
                   text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
                   confirmButtonText: 'ตกลง'
                 });
                 e.target.value = '';
                 imagePreview.style.display = 'none';
                 return;
               }
               
               // แสดงตัวอย่างรูป
               const reader = new FileReader();
               reader.onload = function(e) {
                 previewImg.src = e.target.result;
                 imagePreview.style.display = 'block';
               };
               reader.readAsDataURL(file);
             } else {
               imagePreview.style.display = 'none';
             }
           });
         }
         
         // เปลี่ยนปุ่มบันทึกให้เรียกฟังก์ชันใหม่
         const saveBtn = document.getElementById('save-student-btn');
         if (saveBtn) {
           // ลบ event listener เดิม
           const oldSaveBtn = saveBtn.cloneNode(true);
           saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);
           
           // เพิ่ม event listener ใหม่
           oldSaveBtn.addEventListener('click', function() {
             processSaveStudentForm();
           });
         }
       }
       
       document.getElementById('student-modal-overlay').classList.add('active');
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: result.message || 'ไม่สามารถโหลดข้อมูลนักเรียนได้',
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
       confirmButtonText: 'ตกลง'
     });
   })
   .getStudentById(sessionId, studentId);
}

function deleteStudent(studentId) {
 Swal.fire({
   title: 'ยืนยันการลบ',
   text: "คุณแน่ใจหรือไม่ที่จะลบนักเรียนคนนี้?",
   icon: 'warning',
   showCancelButton: true,
   confirmButtonColor: '#d33',
   cancelButtonColor: '#3085d6',
   confirmButtonText: 'ใช่, ลบเลย',
   cancelButtonText: 'ยกเลิก'
 }).then((result) => {
   if (result.isConfirmed) {
     // แสดงหน้าโหลด
     document.getElementById('loading-spinner').classList.remove('hidden');
     
     google.script.run
       .withSuccessHandler(function(response) {
         document.getElementById('loading-spinner').classList.add('hidden');
         
         if (response.status === 'success') {
           // โหลดข้อมูลนักเรียนใหม่
           loadStudents(document.getElementById('filter-class').value);
           
           Swal.fire({
             icon: 'success',
             title: 'สำเร็จ',
             text: 'ลบนักเรียนเรียบร้อยแล้ว',
             confirmButtonText: 'ตกลง'
           });
         } else {
           Swal.fire({
             icon: 'error',
             title: 'เกิดข้อผิดพลาด',
             text: response.message,
             confirmButtonText: 'ตกลง'
           });
         }
       })
       .withFailureHandler(function(error) {
         document.getElementById('loading-spinner').classList.add('hidden');
         
         Swal.fire({
           icon: 'error',
           title: 'เกิดข้อผิดพลาด',
           text: 'ไม่สามารถลบนักเรียนได้: ' + error.message,
           confirmButtonText: 'ตกลง'
         });
       })
       .deleteStudent(sessionId, studentId);
   }
 });
}

function filterStudentsByClass() {
 const classId = document.getElementById('filter-class').value;
 loadStudents(classId);
}

function showAssignmentsSection() {
  hideAllSections();
  document.getElementById('assignments-content').classList.remove('hidden');
  setActiveMenuItem('menu-assignments');
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลทั้งหมดพร้อมกัน
  Promise.all([
    // โหลดข้อมูลครูผู้สอน
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getTeachers(sessionId);
    }),
    // โหลดข้อมูลระดับชั้น
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getClasses(sessionId);
    }),
    // โหลดข้อมูลรายวิชา
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getSubjects(sessionId);
    }),
    // โหลดข้อมูลการมอบหมาย
    new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getAssignments(sessionId);
    })
  ]).then(results => {
    document.getElementById('loading-spinner').classList.add('hidden');
    
    // เก็บข้อมูลในตัวแปรโกลบอล
    teachers = results[0].teachers || [];
    classes = results[1].classes || [];
    subjects = results[2].subjects || [];
    assignments = results[3].assignments || [];
    
    // อัปเดตตัวเลือกในฟอร์ม
    populateTeacherSelect();
    populateClassSelect();
    populateSubjectSelect();
    
    // แสดงตารางการมอบหมาย
    renderAssignmentsTable();
    
    console.log('Assignment data loaded:', {
      teachers: teachers.length,
      classes: classes.length,
      subjects: subjects.length,
      assignments: assignments.length
    });
    
  }).catch(error => {
    document.getElementById('loading-spinner').classList.add('hidden');
    
    console.error('Error loading assignment data:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลได้: ' + (error.message || 'ไม่ทราบสาเหตุ'),
      confirmButtonText: 'ตกลง'
    });
  });
}

function loadTeachersForAssignment() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(results) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     teachers = results.teachers || [];
     populateTeacherSelect();
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลครูผู้สอนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getTeachers(sessionId);
}

function loadSubjectsForAssignment() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(results) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     subjects = results.subjects || [];
     populateSubjectSelect();
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลรายวิชาได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getSubjects(sessionId);
}

function populateTeacherSelect() {
  const teacherSelect = document.getElementById('assignment-teacher');
  const filterTeacherSelect = document.getElementById('filter-assignment-teacher');
  
  // ล้างตัวเลือกเดิม
  if (teacherSelect) {
    teacherSelect.innerHTML = '<option value="">-- เลือกครูผู้สอน --</option>';
    teachers.forEach(teacher => {
      teacherSelect.innerHTML += `<option value="${teacher.user_id}">${teacher.name} (${teacher.username})</option>`;
    });
  }
  
  // ตัวกรอง
  if (filterTeacherSelect) {
    filterTeacherSelect.innerHTML = '<option value="">ทั้งหมด</option>';
    teachers.forEach(teacher => {
      filterTeacherSelect.innerHTML += `<option value="${teacher.user_id}">${teacher.name}</option>`;
    });
  }
}

// ฟังก์ชันรีเฟรชข้อมูลการมอบหมาย
function refreshAssignments() {
  document.getElementById('refresh-assignments-btn').innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> กำลังโหลด...';
  document.getElementById('refresh-assignments-btn').disabled = true;
  
  showAssignmentsSection(); // โหลดข้อมูลใหม่
  
  setTimeout(() => {
    document.getElementById('refresh-assignments-btn').innerHTML = '<i class="fas fa-sync-alt"></i> รีเฟรช';
    document.getElementById('refresh-assignments-btn').disabled = false;
  }, 1000);
}

// ฟังก์ชันล้างตัวกรอง
function clearAssignmentFilters() {
  document.getElementById('filter-assignment-teacher').value = '';
  document.getElementById('filter-assignment-class').value = '';
  document.getElementById('filter-assignment-subject').value = '';
  
  // แสดงข้อมูลทั้งหมด
  renderAssignmentsTable();
  
  // ซ่อนผลการกรอง
  document.getElementById('assignment-filter-results-info').classList.add('hidden');
}

// ฟังก์ชันกรองการมอบหมาย
function filterAssignments() {
  const teacherFilter = document.getElementById('filter-assignment-teacher').value;
  const classFilter = document.getElementById('filter-assignment-class').value;
  const subjectFilter = document.getElementById('filter-assignment-subject').value;
  
  // ถ้าไม่มีการกรอง ให้แสดงทั้งหมด
  if (!teacherFilter && !classFilter && !subjectFilter) {
    clearAssignmentFilters();
    return;
  }
  
  // กรองข้อมูล
  let filteredAssignments = assignments.filter(assignment => {
    let matchTeacher = !teacherFilter || assignment.teacher_id === teacherFilter;
    let matchClass = !classFilter || assignment.class_id === classFilter;
    let matchSubject = !subjectFilter || assignment.subject_id === subjectFilter;
    
    return matchTeacher && matchClass && matchSubject;
  });
  
  // แสดงผลการกรอง
  const resultInfo = document.getElementById('assignment-filter-results-info');
  const resultText = document.getElementById('assignment-filter-results-text');
  
  resultText.textContent = `แสดงผล ${filteredAssignments.length} รายการ จากทั้งหมด ${assignments.length} รายการ`;
  resultInfo.classList.remove('hidden');
  
  // แสดงตารางที่กรองแล้ว
  const originalAssignments = assignments;
  assignments = filteredAssignments;
  renderAssignmentsTable();
  assignments = originalAssignments; // เก็บข้อมูลเดิมไว้
}

function populateSubjectSelect() {
  const subjectsContainer = document.getElementById('subjects-selection');
  const filterSubjectSelect = document.getElementById('filter-assignment-subject');
  
  // สำหรับ Assignment form - สร้าง checkbox list
  if (subjectsContainer) {
    subjectsContainer.innerHTML = '';
    
    // จัดกลุ่มตามประเภทวิชา
    const subjectsByType = {};
    subjects.forEach(subject => {
      if (!subjectsByType[subject.type]) {
        subjectsByType[subject.type] = [];
      }
      subjectsByType[subject.type].push(subject);
    });
    
    // สร้าง checkbox สำหรับแต่ละประเภทวิชา
    Object.keys(subjectsByType).forEach(type => {
      // หัวข้อประเภทวิชา
      const typeHeader = document.createElement('div');
      typeHeader.style.cssText = 'font-weight: bold; color: #555; margin: 10px 0 5px 0; padding: 5px 0; border-bottom: 1px solid #eee;';
      typeHeader.textContent = type;
      subjectsContainer.appendChild(typeHeader);
      
      subjectsByType[type].forEach(subject => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'subject-checkbox-item';
        checkboxItem.onclick = function() {
          const checkbox = this.querySelector('input[type="checkbox"]');
          checkbox.checked = !checkbox.checked;
          updateSubjectSelection();
        };
        
        // กำหนดคลาสสีตามประเภทวิชา
        let badgeClass = 'subject-type-basic';
        if (type === 'เพิ่มเติม') badgeClass = 'subject-type-additional';
        else if (type === 'เลือกเสรี') badgeClass = 'subject-type-elective';
        else if (type === 'กิจกรรมพัฒนาผู้เรียน') badgeClass = 'subject-type-activity';
        
        checkboxItem.innerHTML = `
          <input type="checkbox" value="${subject.subject_id}" onclick="event.stopPropagation(); updateSubjectSelection();">
          <div class="subject-info">
            <div class="subject-name">${subject.code} - ${subject.name}</div>
            <div class="subject-details">${subject.credit} หน่วยกิต</div>
          </div>
          <span class="subject-type-badge ${badgeClass}">${type}</span>
        `;
        
        subjectsContainer.appendChild(checkboxItem);
      });
    });
  }
  
  // สำหรับ Assignment filter - dropdown ปกติ
  if (filterSubjectSelect) {
    filterSubjectSelect.innerHTML = '<option value="">ทั้งหมด</option>';
    subjects.forEach(subject => {
      filterSubjectSelect.innerHTML += `<option value="${subject.subject_id}">${subject.code} - ${subject.name}</option>`;
    });
  }
}

// ฟังก์ชันอัปเดตสรุปการมอบหมาย
function updateAssignmentSummary() {
  const selectedClasses = document.querySelectorAll('#classes-selection input[type="checkbox"]:checked');
  const selectedSubjects = document.querySelectorAll('#subjects-selection input[type="checkbox"]:checked');
  const summaryDiv = document.getElementById('assignment-summary');
  const summaryText = document.getElementById('assignment-summary-text');
  
  if (selectedClasses.length > 0 && selectedSubjects.length > 0) {
    const totalAssignments = selectedClasses.length * selectedSubjects.length;
    
    summaryText.innerHTML = `
      <div class="summary-item">
        <i class="fas fa-school"></i> 
        ระดับชั้น: <span class="summary-count">${selectedClasses.length}</span> ชั้น
      </div>
      <div class="summary-item">
        <i class="fas fa-book"></i> 
        รายวิชา: <span class="summary-count">${selectedSubjects.length}</span> วิชา
      </div>
      <div class="summary-item">
        <i class="fas fa-tasks"></i> 
        การมอบหมายทั้งหมด: <span class="summary-count">${totalAssignments}</span> รายการ
      </div>
      <div class="summary-item" style="margin-top: 10px; font-size: 0.85em; color: #6c757d;">
        <i class="fas fa-info-circle"></i> 
        ระบบจะสร้างการมอบหมายสำหรับทุกชั้น × ทุกวิชาที่เลือก
      </div>
    `;
    
    summaryDiv.style.display = 'block';
  } else {
    summaryDiv.style.display = 'none';
  }
}

// ฟังก์ชันอัปเดตการเลือกวิชา (แก้ไขให้เรียก updateAssignmentSummary())
function updateSubjectSelection() {
  const checkboxes = document.querySelectorAll('#subjects-selection input[type="checkbox"]:checked');
  const selectedInfo = document.getElementById('selected-subjects-info');
  const selectedList = document.getElementById('selected-subjects-list');
  
  // อัปเดตสไตล์ของ checkbox items
  document.querySelectorAll('.subject-checkbox-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox.checked) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  if (checkboxes.length > 0) {
    selectedInfo.style.display = 'block';
    selectedList.innerHTML = '';
    
    checkboxes.forEach(checkbox => {
      const subject = subjects.find(s => s.subject_id === checkbox.value);
      if (subject) {
        const tag = document.createElement('span');
        tag.className = 'selected-subject-tag';
        tag.innerHTML = `
          ${subject.code} - ${subject.name}
          <span class="remove-subject" onclick="removeSubjectSelection('${subject.subject_id}')">&times;</span>
        `;
        selectedList.appendChild(tag);
      }
    });
  } else {
    selectedInfo.style.display = 'none';
  }
  
  // อัปเดตสรุปการมอบหมาย
  updateAssignmentSummary();
}

// ฟังก์ชันลบการเลือกวิชา (แก้ไขให้เรียก updateAssignmentSummary())
function removeSubjectSelection(subjectId) {
  const checkbox = document.querySelector(`#subjects-selection input[value="${subjectId}"]`);
  if (checkbox) {
    checkbox.checked = false;
    updateSubjectSelection();
  }
}



function loadAssignments() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(results) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     assignments = results.assignments || [];
     renderAssignmentsTable();
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลการมอบหมายได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getAssignments(sessionId);
}

function renderAssignmentsTable() {
  const tableBody = document.getElementById('assignments-table-body');
  tableBody.innerHTML = '';
  
  // อัปเดตสถิติ
  updateAssignmentStatistics();
  
  if (assignments.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 30px; color: #7f8c8d;">
        <i class="fas fa-tasks" style="font-size: 3em; margin-bottom: 10px; opacity: 0.5;"></i><br>
        ยังไม่มีการมอบหมายรายวิชา<br>
        <small>คลิกปุ่ม "มอบหมายวิชา" เพื่อเริ่มต้น</small>
      </td>
    `;
    tableBody.appendChild(row);
    return;
  }
  
  // จัดกลุ่มการมอบหมายตามครูและระดับชั้น
  const groupedAssignments = {};
  
  assignments.forEach(assignment => {
    const key = `${assignment.teacher_id}_${assignment.class_id}`;
    if (!groupedAssignments[key]) {
      groupedAssignments[key] = {
        teacher_id: assignment.teacher_id,
        class_id: assignment.class_id,
        assignments: [],
        created_at: assignment.created_at
      };
    }
    groupedAssignments[key].assignments.push(assignment);
  });
  
  // เรียงข้อมูลตามชื่อครู
  const sortedGroups = Object.values(groupedAssignments).sort((a, b) => {
    const teacherA = teachers.find(t => t.user_id === a.teacher_id);
    const teacherB = teachers.find(t => t.user_id === b.teacher_id);
    const nameA = teacherA ? teacherA.name : '';
    const nameB = teacherB ? teacherB.name : '';
    
    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    }
    
    // ถ้าชื่อครูเหมือนกัน ให้เรียงตามชื่อชั้น
    const classA = classes.find(c => c.class_id === a.class_id);
    const classB = classes.find(c => c.class_id === b.class_id);
    const classNameA = classA ? classA.name : '';
    const classNameB = classB ? classB.name : '';
    
    return classNameA.localeCompare(classNameB);
  });
  
  sortedGroups.forEach(group => {
    // หาข้อมูลครู
    const teacher = teachers.find(t => t.user_id === group.teacher_id);
    const teacherName = teacher ? teacher.name : 'ไม่พบข้อมูลครู';
    const teacherUsername = teacher ? teacher.username : '';
    
    // หาข้อมูลระดับชั้น
    const classObj = classes.find(c => c.class_id === group.class_id);
    const className = classObj ? classObj.name : 'ไม่พบข้อมูลชั้นเรียน';
    
    // สร้างรายการวิชาทั้งหมดในกลุ่มนี้
    const subjectsList = group.assignments.map(assignment => {
      const subject = subjects.find(s => s.subject_id === assignment.subject_id);
      if (subject) {
        // กำหนดสีตามประเภทวิชา
        let badgeColor = '#3498db';
        if (subject.type === 'เพิ่มเติม') badgeColor = '#2ecc71';
        else if (subject.type === 'เลือกเสรี') badgeColor = '#9b59b6';
        else if (subject.type === 'กิจกรรมพัฒนาผู้เรียน') badgeColor = '#f1c40f';
        
        return {
          ...assignment,
          subject: subject,
          badgeColor: badgeColor
        };
      }
      return {
        ...assignment,
        subject: null,
        badgeColor: '#6c757d'
      };
    });
    
    // เรียงรายวิชาตามประเภทและชื่อ
    subjectsList.sort((a, b) => {
      if (a.subject && b.subject) {
        if (a.subject.type !== b.subject.type) {
          return a.subject.type.localeCompare(b.subject.type);
        }
        return a.subject.name.localeCompare(b.subject.name);
      }
      return 0;
    });
    
    // สร้างแถวสำหรับแสดงข้อมูล
    const row = document.createElement('tr');
    
    // สร้าง HTML สำหรับรายวิชา
    let subjectsHtml = '';
    let subjectTypesHtml = '';
    let actionsHtml = '';
    
    subjectsList.forEach((item, index) => {
      const subject = item.subject;
      const subjectName = subject ? subject.name : 'ไม่พบข้อมูลรายวิชา';
      const subjectCode = subject ? subject.code : '';
      const subjectType = subject ? subject.type : '';
      const subjectCredit = subject ? subject.credit : '';
      
      subjectsHtml += `
        <div style="margin-bottom: ${index < subjectsList.length - 1 ? '8px' : '0'}; padding: 6px 0; ${index < subjectsList.length - 1 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
          <div style="font-weight: bold; font-size: 0.9em;">${subjectCode} - ${subjectName}</div>
          <div style="font-size: 0.8em; color: #666;">${subjectCredit ? subjectCredit + ' หน่วยกิต' : ''}</div>
        </div>
      `;
      
      subjectTypesHtml += `
        <div style="margin-bottom: ${index < subjectsList.length - 1 ? '8px' : '0'}; padding: 6px 0; text-align: center;">
          <span style="background-color: ${item.badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75em;">
            ${subjectType}
          </span>
        </div>
      `;
      
      actionsHtml += `
        <div style="margin-bottom: ${index < subjectsList.length - 1 ? '8px' : '0'}; padding: 6px 0; text-align: center;">
          <button class="btn btn-sm btn-primary" onclick="editAssignment('${item.assignment_id}')" title="แก้ไข" style="margin-right: 5px;">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteAssignment('${item.assignment_id}')" title="ลบ">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    });
    
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center;">
          ${teacher && teacher.profile_image ? 
            `<img src="${teacher.profile_image}" alt="รูปโปรไฟล์" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 12px; object-fit: cover;">` : 
            `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #f0f0f0; margin-right: 12px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: #ccc;"></i></div>`
          }
          <div>
            <div style="font-weight: bold; font-size: 1em;">${teacherName}</div>
            <div style="font-size: 0.85em; color: #666;">${teacherUsername}</div>
            <div style="font-size: 0.8em; color: #28a745; margin-top: 2px;">
              <i class="fas fa-tasks"></i> ${subjectsList.length} วิชา
            </div>
          </div>
        </div>
      </td>
      <td>
        <div style="text-align: center;">
          <span style="padding: 8px 12px; background-color: #fff3cd; color: #856404; border-radius: 6px; font-weight: bold; display: inline-block;">
            <i class="fas fa-school"></i> ${className}
          </span>
        </div>
      </td>
      <td style="min-width: 250px;">
        ${subjectsHtml}
      </td>
      <td style="min-width: 120px;">
        ${subjectTypesHtml}
      </td>
      <td style="text-align: center;">
        <div style="font-size: 0.9em; color: #666;">
          ${formatDate(group.created_at)}
        </div>
      </td>
      <td style="min-width: 120px;">
        ${actionsHtml}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// ฟังก์ชันลบการมอบหมายทั้งกลุ่ม (ครู + ชั้น)
function deleteTeacherClassAssignments(teacherId, classId) {
  // หาข้อมูลครูและชั้น
  const teacher = teachers.find(t => t.user_id === teacherId);
  const classObj = classes.find(c => c.class_id === classId);
  
  const teacherName = teacher ? teacher.name : 'ไม่ทราบชื่อ';
  const className = classObj ? classObj.name : 'ไม่ทราบชั้น';
  
  // หาการมอบหมายทั้งหมดของครูคนนี้ในชั้นนี้
  const relatedAssignments = assignments.filter(a => 
    a.teacher_id === teacherId && a.class_id === classId
  );
  
  if (relatedAssignments.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'ไม่พบข้อมูล',
      text: 'ไม่พบการมอบหมายที่เกี่ยวข้อง',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  Swal.fire({
    title: 'ยืนยันการลบ',
    html: `
      <div style="text-align: left;">
        <p><strong>ครูผู้สอน:</strong> ${teacherName}</p>
        <p><strong>ระดับชั้น:</strong> ${className}</p>
        <p><strong>รายวิชาที่จะลบ:</strong> ${relatedAssignments.length} วิชา</p>
        <div style="color: #dc3545; font-weight: bold; margin-top: 10px;">
          คุณแน่ใจหรือไม่ที่จะลบการมอบหมายทั้งหมดนี้?
        </div>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ลบทั้งหมด',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // แสดงหน้าโหลด
      document.getElementById('loading-spinner').classList.remove('hidden');
      
      let deletedCount = 0;
      let errorCount = 0;
      let completedCount = 0;
      
      relatedAssignments.forEach(assignment => {
        google.script.run
          .withSuccessHandler(function(response) {
            completedCount++;
            
            if (response.status === 'success') {
              deletedCount++;
            } else {
              errorCount++;
              console.error('Delete error:', response.message);
            }
            
            // ถ้าเสร็จหมดแล้ว
            if (completedCount === relatedAssignments.length) {
              document.getElementById('loading-spinner').classList.add('hidden');
              
              if (deletedCount > 0) {
                showAssignmentsSection(); // รีโหลดข้อมูล
                
                let message = `ลบการมอบหมายเรียบร้อยแล้ว ${deletedCount} รายการ`;
                if (errorCount > 0) {
                  message += ` (ไม่สำเร็จ ${errorCount} รายการ)`;
                }
                
                Swal.fire({
                  icon: deletedCount === relatedAssignments.length ? 'success' : 'warning',
                  title: deletedCount === relatedAssignments.length ? 'สำเร็จ' : 'สำเร็จบางส่วน',
                  text: message,
                  confirmButtonText: 'ตกลง'
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด',
                  text: 'ไม่สามารถลบการมอบหมายได้',
                  confirmButtonText: 'ตกลง'
                });
              }
            }
          })
          .withFailureHandler(function(error) {
            completedCount++;
            errorCount++;
            console.error('Delete failure:', error);
            
            // ถ้าเสร็จหมดแล้ว
            if (completedCount === relatedAssignments.length) {
              document.getElementById('loading-spinner').classList.add('hidden');
              
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: `ลบการมอบหมายไม่สำเร็จ (สำเร็จ ${deletedCount} รายการ, ไม่สำเร็จ ${errorCount} รายการ)`,
                confirmButtonText: 'ตกลง'
              });
            }
          })
          .deleteAssignment(sessionId, assignment.assignment_id);
      });
    }
  });
}

// ฟังก์ชันอัปเดตสถิติ
function updateAssignmentStatistics() {
  const totalTeachersElement = document.getElementById('total-teachers-count');
  const totalAssignmentsElement = document.getElementById('total-assignments-count');
  const assignedTeachersElement = document.getElementById('assigned-teachers-count');
  const unassignedTeachersElement = document.getElementById('unassigned-teachers-count');
  
  if (totalTeachersElement) totalTeachersElement.textContent = teachers.length;
  if (totalAssignmentsElement) totalAssignmentsElement.textContent = assignments.length;
  
  // นับครูที่ได้รับมอบหมาย
  const assignedTeacherIds = [...new Set(assignments.map(a => a.teacher_id))];
  if (assignedTeachersElement) assignedTeachersElement.textContent = assignedTeacherIds.length;
  
  // นับครูที่ยังไม่ได้มอบหมาย
  const unassignedCount = teachers.length - assignedTeacherIds.length;
  if (unassignedTeachersElement) unassignedTeachersElement.textContent = unassignedCount;
}

function editAssignment(assignmentId) {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(result) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (result.status === 'success') {
        const assignment = result.assignment;
        
        // เปิด modal แก้ไข
        document.getElementById('assignment-id').value = assignmentId;
        document.getElementById('assignment-teacher').value = assignment.teacher_id;
        
        // เลือกระดับชั้นที่ถูกมอบหมาย
        const classCheckbox = document.querySelector(`#classes-selection input[value="${assignment.class_id}"]`);
        if (classCheckbox) {
          classCheckbox.checked = true;
        }
        
        // เลือกวิชาที่ถูกมอบหมาย
        const subjectCheckbox = document.querySelector(`#subjects-selection input[value="${assignment.subject_id}"]`);
        if (subjectCheckbox) {
          subjectCheckbox.checked = true;
        }
        
        updateClassSelection();
        updateSubjectSelection();
        updateAssignmentSummary();
        
        document.getElementById('assignment-modal-title').textContent = 'แก้ไขการมอบหมายวิชา';
        document.getElementById('assignment-modal-overlay').classList.add('active');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: result.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลการมอบหมายได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getAssignmentById(sessionId, assignmentId);
}

function deleteAssignment(assignmentId) {
 Swal.fire({
   title: 'ยืนยันการลบ',
   text: "คุณแน่ใจหรือไม่ที่จะลบการมอบหมายนี้?",
   icon: 'warning',
   showCancelButton: true,
   confirmButtonColor: '#d33',
   cancelButtonColor: '#3085d6',
   confirmButtonText: 'ใช่, ลบเลย',
   cancelButtonText: 'ยกเลิก'
 }).then((result) => {
   if (result.isConfirmed) {
     // แสดงหน้าโหลด
     document.getElementById('loading-spinner').classList.remove('hidden');
     
     google.script.run
       .withSuccessHandler(function(response) {
         document.getElementById('loading-spinner').classList.add('hidden');
         
         if (response.status === 'success') {
           // โหลดข้อมูลการมอบหมายใหม่
           loadAssignments();
           
           Swal.fire({
             icon: 'success',
             title: 'สำเร็จ',
             text: 'ลบการมอบหมายเรียบร้อยแล้ว',
             confirmButtonText: 'ตกลง'
           });
         } else {
           Swal.fire({
             icon: 'error',
             title: 'เกิดข้อผิดพลาด',
             text: response.message,
             confirmButtonText: 'ตกลง'
           });
         }
       })
       .withFailureHandler(function(error) {
         document.getElementById('loading-spinner').classList.add('hidden');
         
         Swal.fire({
           icon: 'error',
           title: 'เกิดข้อผิดพลาด',
           text: 'ไม่สามารถลบการมอบหมายได้: ' + error.message,
           confirmButtonText: 'ตกลง'
         });
       })
       .deleteAssignment(sessionId, assignmentId);
   }
 });
}

// จัดการคำขอรีเซ็ตรหัสผ่าน
function showPasswordResetsSection() {
 hideAllSections();
 document.getElementById('password-resets-content').classList.remove('hidden');
 setActiveMenuItem('menu-password-resets');
 
 // โหลดข้อมูลคำขอรีเซ็ตรหัสผ่าน
 loadPasswordResets();
}

function loadPasswordResets() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(results) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     const requests = results.requests || [];
     renderPasswordResetsTable(requests);
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลคำขอรีเซ็ตรหัสผ่านได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getPasswordResetRequests(sessionId);
}

function renderPasswordResetsTable(requests) {
 const tableBody = document.getElementById('password-resets-table-body');
 const emptyMessage = document.getElementById('password-resets-empty');
 
 tableBody.innerHTML = '';
 
 if (requests.length === 0) {
   emptyMessage.classList.remove('hidden');
   return;
 }
 
 emptyMessage.classList.add('hidden');
 
 requests.forEach(request => {
   const row = document.createElement('tr');
   row.innerHTML = `
     <td>${request.username}</td>
     <td>${request.name}</td>
     <td>${formatDate(request.requested_at)}</td>
     <td>
       <button class="btn btn-sm btn-success" onclick="resetPassword('${request.user_id}', '${request.name}')">
         <i class="fas fa-key"></i> รีเซ็ตรหัสผ่าน
       </button>
     </td>
   `;
   tableBody.appendChild(row);
 });
}

function showTeacherDashboard() {
  // ตรวจสอบ sessionId
  if (!sessionId) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่',
      confirmButtonText: 'ตกลง'
    }).then(() => {
      logout(); // ออกจากระบบและกลับไปหน้าเข้าสู่ระบบ
    });
    return;
  }

  // ซ่อนเมนูสำหรับผู้ดูแลและนักเรียน
  document.getElementById('admin-menu').classList.add('hidden');
  document.getElementById('student-menu').classList.add('hidden');
  
  // แสดงเมนูสำหรับครู
  document.getElementById('teacher-menu').classList.remove('hidden');
  
  // แสดงหน้ารายวิชาที่สอน
  hideAllSections();
  document.getElementById('teacher-subjects-content').classList.remove('hidden');
  
  // เลือกเมนูรายวิชาที่สอน
  setActiveMenuItem('menu-teacher-subjects');
  
  // โหลดข้อมูลรายวิชาที่รับผิดชอบ
  loadTeacherSubjects();
}

function loadTeacherSubjects() {
  // ตรวจสอบ sessionId
  if (!sessionId) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่',
      confirmButtonText: 'ตกลง'
    }).then(() => {
      logout();
    });
    return;
  }

  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // ตั้งค่า CSS สำหรับ container
  const container = document.getElementById('teacher-subjects');
  if (container) {
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      padding: 20px 0;
      min-height: 200px;
    `;
  }
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (results.status === 'success') {
        renderTeacherSubjectCards(results.subjects || []);
      } else {
        // ตรวจสอบว่าเป็นปัญหาเกี่ยวกับสิทธิ์หรือไม่
        if (results.message && results.message.includes('ไม่มีสิทธิ์เข้าถึง')) {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่',
            confirmButtonText: 'ตกลง'
          }).then(() => {
            // ลบข้อมูล session และกลับไปหน้าเข้าสู่ระบบ
            localStorage.removeItem('sessionId');
            sessionId = null;
            userData = null;
            showLoginForm();
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: results.message,
            confirmButtonText: 'ตกลง'
          });
        }
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลรายวิชาได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getTeacherSubjects(sessionId);
}

function renderTeacherSubjectCards(teacherSubjects) {
  const container = document.getElementById('teacher-subjects');
  container.innerHTML = '';
  
  if (teacherSubjects.length === 0) {
    container.innerHTML = `
      <div style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #7f8c8d;
        background: white;
        border-radius: 20px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        margin: 20px 0;
      ">
        <div style="
          width: 120px;
          height: 120px;
          margin: 0 auto 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        ">
          <i class="fas fa-book-open" style="font-size: 3em; color: white;"></i>
        </div>
        <h3 style="
          font-size: 1.5em;
          margin-bottom: 15px;
          color: #2c3e50;
          font-weight: 600;
        ">ไม่พบรายวิชาที่รับผิดชอบ</h3>
        <p style="
          font-size: 1em;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto;
        ">
          ยังไม่มีการมอบหมายรายวิชาให้คุณ<br>
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอรับมอบหมายรายวิชา
        </p>
      </div>
    `;
    return;
  }
  
  // จัดกลุ่มรายวิชาตามประเภท
  const groupedSubjects = {};
  teacherSubjects.forEach(subject => {
    if (!groupedSubjects[subject.subject_type]) {
      groupedSubjects[subject.subject_type] = [];
    }
    groupedSubjects[subject.subject_type].push(subject);
  });
  
  // เรียงลำดับประเภทวิชา
  const typeOrder = ['พื้นฐาน', 'เพิ่มเติม', 'เลือกเสรี', 'กิจกรรมพัฒนาผู้เรียน'];
  
  // สร้างการ์ดสำหรับแต่ละประเภทวิชา
  typeOrder.forEach(type => {
    if (groupedSubjects[type] && groupedSubjects[type].length > 0) {
      // สร้างหัวข้อประเภทวิชา
      const typeHeader = document.createElement('div');
      typeHeader.style.cssText = `
        grid-column: 1 / -1;
        margin: 30px 0 20px 0;
        padding: 20px 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        color: white;
        text-align: center;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        position: relative;
        overflow: hidden;
      `;
      
      // กำหนดไอคอนและสีตามประเภทวิชา
      let icon = 'fas fa-book';
      let gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      let shadowColor = 'rgba(102, 126, 234, 0.3)';
      
      if (type === 'เพิ่มเติม') {
        icon = 'fas fa-plus-circle';
        gradient = 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)';
        shadowColor = 'rgba(86, 204, 242, 0.3)';
      } else if (type === 'เลือกเสรี') {
        icon = 'fas fa-star';
        gradient = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
        shadowColor = 'rgba(168, 237, 234, 0.3)';
      } else if (type === 'กิจกรรมพัฒนาผู้เรียน') {
        icon = 'fas fa-users';
        gradient = 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)';
        shadowColor = 'rgba(255, 234, 167, 0.3)';
      }
      
      typeHeader.style.background = gradient;
      typeHeader.style.boxShadow = `0 8px 25px ${shadowColor}`;
      
      typeHeader.innerHTML = `
        <div style="
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 100px;
          height: 100px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        "></div>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          position: relative;
          z-index: 1;
        ">
          <i class="${icon}" style="font-size: 1.8em;"></i>
          <div>
            <div style="font-size: 1.3em; font-weight: bold; margin-bottom: 5px;">
              ${type}
            </div>
            <div style="
              background: rgba(255,255,255,0.25);
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.9em;
              display: inline-block;
            ">
              ${groupedSubjects[type].length} รายวิชา
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(typeHeader);
      
      // สร้างการ์ดรายวิชา
      groupedSubjects[type].forEach((subject, index) => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        
        // กำหนดสีตามประเภทวิชา
        let cardGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        let borderColor = '#667eea';
        let iconColor = '#667eea';
        
        if (subject.subject_type === 'เพิ่มเติม') {
          cardGradient = 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)';
          borderColor = '#56ccf2';
          iconColor = '#56ccf2';
        } else if (subject.subject_type === 'เลือกเสรี') {
          cardGradient = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
          borderColor = '#a8edea';
          iconColor = '#a8edea';
        } else if (subject.subject_type === 'กิจกรรมพัฒนาผู้เรียน') {
          cardGradient = 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)';
          borderColor = '#ffeaa7';
          iconColor = '#fab1a0';
        }
        
        card.style.cssText = `
          background: white;
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          animation: slideInUp 0.6s ease-out ${index * 0.1}s both;
        `;
        
        card.onmouseover = function() {
          this.style.transform = 'translateY(-12px) scale(1.03)';
          this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
          this.style.borderColor = borderColor;
        };
        
        card.onmouseout = function() {
          this.style.transform = 'translateY(0) scale(1)';
          this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
          this.style.borderColor = 'transparent';
        };
        
        card.onclick = function() {
          showSubjectDetail(subject);
        };
        
        card.innerHTML = `
          <!-- Top Gradient Bar -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: ${cardGradient};
            border-radius: 20px 20px 0 0;
          "></div>
          
          <!-- Header Section -->
          <div style="margin-bottom: 20px; margin-top: 10px;">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 15px;
            ">
              <span style="
                background: ${cardGradient};
                color: white;
                padding: 6px 16px;
                border-radius: 25px;
                font-size: 0.8em;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-transform: uppercase;
              ">${subject.subject_code}</span>
              
              <div style="
                width: 40px;
                height: 40px;
                background: ${cardGradient};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
              " class="subject-icon">
                <i class="fas fa-arrow-right" style="color: white; font-size: 1em;"></i>
              </div>
            </div>
            
            <h3 style="
              font-size: 1.15em;
              color: #2c3e50;
              margin: 0 0 15px 0;
              line-height: 1.4;
              font-weight: 600;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              min-height: 2.8em;
            ">${subject.subject_name}</h3>
          </div>
          
          <!-- Info Section -->
          <div style="margin-bottom: 20px;">
            <div style="
              display: flex;
              align-items: center;
              padding: 12px 16px;
              background: #f8f9ff;
              border-radius: 12px;
              border-left: 4px solid ${borderColor};
            ">
              <i class="fas fa-school" style="
                color: ${iconColor};
                margin-right: 12px;
                font-size: 1.1em;
              "></i>
              <div>
                <div style="
                  font-size: 0.85em;
                  color: #7f8c8d;
                  margin-bottom: 2px;
                ">ระดับชั้น</div>
                <div style="
                  font-weight: 600;
                  color: #2c3e50;
                  font-size: 0.95em;
                ">${subject.class_name}</div>
              </div>
            </div>
          </div>
          
          <!-- Action Button -->
          <div style="margin-top: auto;">
            <button style="
              width: 100%;
              background: ${cardGradient};
              color: white;
              border: none;
              padding: 14px 20px;
              border-radius: 12px;
              font-size: 0.9em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            " 
            onmouseover="
              this.style.transform='translateY(-2px)';
              this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)';
            " 
            onmouseout="
              this.style.transform='translateY(0)';
              this.style.boxShadow='none';
            "
            onclick="event.stopPropagation(); showSubjectDetail({
              subject_id: '${subject.subject_id}',
              subject_code: '${subject.subject_code}',
              subject_name: '${subject.subject_name}',
              subject_type: '${subject.subject_type}',
              class_id: '${subject.class_id}',
              class_name: '${subject.class_name}'
            });">
              <i class="fas fa-chalkboard-teacher"></i>
              <span>เข้าสู่ห้องเรียน</span>
            </button>
          </div>
        `;
        
        container.appendChild(card);
      });
    }
  });
}

function showSubjectDetail(subject) {
 // บันทึกข้อมูลวิชาปัจจุบัน
 currentSubject = subject;
 
 // แสดงรายละเอียดวิชา
 hideAllSections();
 document.getElementById('teacher-subject-detail').classList.remove('hidden');
 document.getElementById('subject-detail-title').textContent = `${subject.subject_code} - ${subject.subject_name} (${subject.class_name})`;
 
 // โหลดเกณฑ์การตัดเกรด
 loadGradingCriteria(subject.subject_id);
 
 // โหลดข้อมูลนักเรียนและเกรด
 loadStudentGrades(subject.subject_id, subject.class_id);
}

function loadGradingCriteria(subjectId) {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // ตรวจสอบว่าฟังก์ชันมีอยู่จริงหรือไม่
  if (typeof google.script.run.getGradingCriteria !== 'function') {
    document.getElementById('loading-spinner').classList.add('hidden');
    
    // ถ้าไม่มีฟังก์ชัน ให้ใช้เกณฑ์มาตรฐาน
    const defaultCriteria = {
      '4': 80,
      '3.5': 75,
      '3': 70,
      '2.5': 65,
      '2': 60,
      '1.5': 55,
      '1': 50,
      '0': 0
    };
    
    renderGradingCriteria(defaultCriteria, currentSubject.subject_type);
    
    console.warn('ฟังก์ชัน getGradingCriteria ไม่มีอยู่ในระบบ');
    return;
  }
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      console.log('Criteria loaded:', results);
      
      if (results.status === 'success') {
        let criteria = results.criteria;
        
        // ตรวจสอบและแปลงข้อมูลที่ได้รับ
        if (typeof criteria === 'string') {
          try {
            criteria = JSON.parse(criteria);
          } catch (e) {
            console.error('Error parsing criteria JSON:', e);
            criteria = null;
          }
        }
        
        // ถ้าไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง ให้ใช้เกณฑ์มาตรฐาน
        if (!criteria || typeof criteria !== 'object') {
          criteria = {
            '4': 80,
            '3.5': 75,
            '3': 70,
            '2.5': 65,
            '2': 60,
            '1.5': 55,
            '1': 50,
            '0': 0
          };
        }
        
        renderGradingCriteria(criteria, currentSubject.subject_type);
      } else {
        console.error('ไม่สามารถโหลดเกณฑ์การตัดเกรดได้:', results.message);
        
        // ใช้เกณฑ์มาตรฐาน
        const defaultCriteria = {
          '4': 80,
          '3.5': 75,
          '3': 70,
          '2.5': 65,
          '2': 60,
          '1.5': 55,
          '1': 50,
          '0': 0
        };
        
        renderGradingCriteria(defaultCriteria, currentSubject.subject_type);
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      console.error('เกิดข้อผิดพลาดในการโหลดเกณฑ์การตัดเกรด:', error);
      
      // ใช้เกณฑ์มาตรฐาน
      const defaultCriteria = {
        '4': 80,
        '3.5': 75,
        '3': 70,
        '2.5': 65,
        '2': 60,
        '1.5': 55,
        '1': 50,
        '0': 0
      };
      
      renderGradingCriteria(defaultCriteria, currentSubject.subject_type);
    })
    .getGradingCriteria(sessionId, subjectId);
}

function renderGradingCriteria(criteria, subjectType) {
  const container = document.getElementById('criteria-details');
  
  if (subjectType === 'กิจกรรมพัฒนาผู้เรียน') {
    container.innerHTML = `<p>ผ่าน: คะแนน ≥ 50, ไม่ผ่าน: คะแนน < 50</p>`;
    return;
  }
  
  if (!criteria) {
    // ใช้เกณฑ์มาตรฐาน
    criteria = {
      '4': 80,
      '3.5': 75,
      '3': 70,
      '2.5': 65,
      '2': 60,
      '1.5': 55,
      '1': 50,
      '0': 0
    };
  }
  
  // ตรวจสอบและแปลงค่าให้เป็นตัวเลข
  const grade4 = criteria['4'] || criteria[4] || 80;
  const grade35 = criteria['3.5'] || criteria[3.5] || 75;
  const grade3 = criteria['3'] || criteria[3] || 70;
  const grade25 = criteria['2.5'] || criteria[2.5] || 65;
  const grade2 = criteria['2'] || criteria[2] || 60;
  const grade15 = criteria['1.5'] || criteria[1.5] || 55;
  const grade1 = criteria['1'] || criteria[1] || 50;
  
  console.log('Rendering criteria:', {
    original: criteria,
    processed: {
      grade4, grade35, grade3, grade25, grade2, grade15, grade1
    }
  });
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: 0.9em;">
      <div style="font-weight: bold; color: #28a745;">เกรด 4:</div>
      <div>คะแนน ≥ ${grade4}</div>
      
      <div style="font-weight: bold; color: #20c997;">เกรด 3.5:</div>
      <div>คะแนน ≥ ${grade35} และ < ${grade4}</div>
      
      <div style="font-weight: bold; color: #17a2b8;">เกรด 3:</div>
      <div>คะแนน ≥ ${grade3} และ < ${grade35}</div>
      
      <div style="font-weight: bold; color: #6f42c1;">เกรด 2.5:</div>
      <div>คะแนน ≥ ${grade25} และ < ${grade3}</div>
      
      <div style="font-weight: bold; color: #fd7e14;">เกรด 2:</div>
      <div>คะแนน ≥ ${grade2} และ < ${grade25}</div>
      
      <div style="font-weight: bold; color: #ffc107;">เกรด 1.5:</div>
      <div>คะแนน ≥ ${grade15} และ < ${grade2}</div>
      
      <div style="font-weight: bold; color: #dc3545;">เกรด 1:</div>
      <div>คะแนน ≥ ${grade1} และ < ${grade15}</div>
      
      <div style="font-weight: bold; color: #6c757d;">เกรด 0:</div>
      <div>คะแนน < ${grade1}</div>
    </div>
  `;
}

function loadStudentGrades(subjectId, classId) {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(results) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (results.status === 'success') {
       renderStudentGradesTable(results.students || [], subjectId);
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: results.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getClassStudents(sessionId, classId);
}

function renderStudentGradesTable(students, subjectId) {
 const tableBody = document.getElementById('student-grades-table-body');
 tableBody.innerHTML = '';
 
 if (students.length === 0) {
   const row = document.createElement('tr');
   row.innerHTML = `
     <td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">ไม่พบข้อมูลนักเรียน</td>
   `;
   tableBody.appendChild(row);
   return;
 }
 
 // โหลดเกรดของแต่ละคน
 google.script.run
   .withSuccessHandler(function(results) {
     const grades = results.grades || [];
     
     students.forEach(student => {
       // หาเกรดของนักเรียน
       const studentGrade = grades.find(g => g.student_id === student.user_id);
       
       const row = document.createElement('tr');
       row.innerHTML = `
         <td>${student.student_id || '-'}</td>
         <td>${student.name}</td>
         <td>${studentGrade ? studentGrade.score : '-'}</td>
         <td>${studentGrade ? studentGrade.grade : '-'}</td>
         <td>
           <button class="btn btn-sm btn-primary" onclick="showGradeModal('${student.user_id}', '${student.name}', ${studentGrade ? studentGrade.score : ''})">
             <i class="fas fa-pencil-alt"></i> บันทึกคะแนน
           </button>
         </td>
       `;
       tableBody.appendChild(row);
     });
   })
   .withFailureHandler(function(error) {
     console.error('ไม่สามารถโหลดข้อมูลเกรดได้:', error);
   })
   .getSubjectGrades(sessionId, subjectId);
}

function showGradeModal(studentId, studentName, score) {
 // กำหนดค่าให้กับฟอร์ม
 document.getElementById('save-grade-title').textContent = `บันทึกคะแนนของ ${studentName}`;
 document.getElementById('grade-student-id').value = studentId;
 document.getElementById('grade-score').value = score || '';
 
 // เปิด modal
 document.getElementById('grade-modal-overlay').classList.add('active');
}

function saveGrade() {
 const studentId = document.getElementById('grade-student-id').value;
 const score = document.getElementById('grade-score').value;
 const subjectId = currentSubject.subject_id;
 
 if (!score) {
   Swal.fire({
     icon: 'warning',
     title: 'กรุณากรอกคะแนน',
     text: 'โปรดระบุคะแนน (0-100)',
     confirmButtonText: 'ตกลง'
   });
   return;
 }
 
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 google.script.run
   .withSuccessHandler(function(response) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (response.status === 'success') {
       // ปิด modal
       document.getElementById('grade-modal-overlay').classList.remove('active');
       
       // โหลดข้อมูลนักเรียนและเกรดใหม่
       loadStudentGrades(subjectId, currentSubject.class_id);
       
       Swal.fire({
         icon: 'success',
         title: 'สำเร็จ',
         html: `บันทึกคะแนนเรียบร้อยแล้ว<br>เกรด: ${response.grade}`,
         confirmButtonText: 'ตกลง'
       });
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: response.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถบันทึกคะแนนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .saveGrade(sessionId, studentId, subjectId, parseFloat(score));
}

function showCriteriaModal() {
  // แสดงข้อมูลรายวิชาปัจจุบัน
  const subjectInfo = document.getElementById('subject-info');
  const subjectDetails = document.getElementById('subject-details');
  
  if (currentSubject) {
    subjectDetails.innerHTML = `
      <div><strong>รหัสวิชา:</strong> ${currentSubject.subject_code}</div>
      <div><strong>ชื่อวิชา:</strong> ${currentSubject.subject_name}</div>
      <div><strong>ประเภท:</strong> ${currentSubject.subject_type}</div>
      <div><strong>ระดับชั้น:</strong> ${currentSubject.class_name}</div>
    `;
  }
  
  // ตรวจสอบประเภทวิชา
  if (currentSubject.subject_type === 'กิจกรรมพัฒนาผู้เรียน') {
    document.getElementById('activity-criteria').classList.remove('hidden');
    document.getElementById('grade-criteria').classList.add('hidden');
    subjectInfo.style.display = 'block';
  } else {
    document.getElementById('activity-criteria').classList.add('hidden');
    document.getElementById('grade-criteria').classList.remove('hidden');
    subjectInfo.style.display = 'block';
    
    // โหลดเกณฑ์ปัจจุบัน
    google.script.run
      .withSuccessHandler(function(results) {
        if (results.status === 'success') {
          let criteria = results.criteria;
          
          // ตรวจสอบและแปลงข้อมูล
          if (typeof criteria === 'string') {
            try {
              criteria = JSON.parse(criteria);
            } catch (e) {
              console.error('Error parsing criteria:', e);
              criteria = null;
            }
          }
          
          // ใช้เกณฑ์มาตรฐานถ้าไม่มีข้อมูล
          if (!criteria) {
            criteria = {
              '4': 80,
              '3.5': 75,
              '3': 70,
              '2.5': 65,
              '2': 60,
              '1.5': 55,
              '1': 50,
              '0': 0
            };
          }
          
          // ตั้งค่าให้กับ input fields
          document.getElementById('criteria-4').value = criteria['4'] || criteria[4] || 80;
          document.getElementById('criteria-35').value = criteria['3.5'] || criteria[3.5] || 75;
          document.getElementById('criteria-3').value = criteria['3'] || criteria[3] || 70;
          document.getElementById('criteria-25').value = criteria['2.5'] || criteria[2.5] || 65;
          document.getElementById('criteria-2').value = criteria['2'] || criteria[2] || 60;
          document.getElementById('criteria-15').value = criteria['1.5'] || criteria[1.5] || 55;
          document.getElementById('criteria-1').value = criteria['1'] || criteria[1] || 50;
          
        } else {
          console.error('ไม่สามารถโหลดเกณฑ์ได้:', results.message);
          
          // ใช้เกณฑ์มาตรฐาน
          document.getElementById('criteria-4').value = 80;
          document.getElementById('criteria-35').value = 75;
          document.getElementById('criteria-3').value = 70;
          document.getElementById('criteria-25').value = 65;
          document.getElementById('criteria-2').value = 60;
          document.getElementById('criteria-15').value = 55;
          document.getElementById('criteria-1').value = 50;
        }
      })
      .withFailureHandler(function(error) {
        console.error('ไม่สามารถโหลดเกณฑ์การตัดเกรดได้:', error);
        
        // ใช้เกณฑ์มาตรฐาน
        document.getElementById('criteria-4').value = 80;
        document.getElementById('criteria-35').value = 75;
        document.getElementById('criteria-3').value = 70;
        document.getElementById('criteria-25').value = 65;
        document.getElementById('criteria-2').value = 60;
        document.getElementById('criteria-15').value = 55;
        document.getElementById('criteria-1').value = 50;
      })
      .getGradingCriteria(sessionId, currentSubject.subject_id);
  }
  
  // เปิด modal
  document.getElementById('criteria-modal-overlay').classList.add('active');
}

function saveCriteria() {
  // ถ้าเป็นกิจกรรมพัฒนาผู้เรียน ไม่ต้องเก็บเกณฑ์
  if (currentSubject.subject_type === 'กิจกรรมพัฒนาผู้เรียน') {
    document.getElementById('criteria-modal-overlay').classList.remove('active');
    return;
  }
  
  // สร้างเกณฑ์จากฟอร์ม
  const criteria = {
    '4': parseFloat(document.getElementById('criteria-4').value),
    '3.5': parseFloat(document.getElementById('criteria-35').value),
    '3': parseFloat(document.getElementById('criteria-3').value),
    '2.5': parseFloat(document.getElementById('criteria-25').value),
    '2': parseFloat(document.getElementById('criteria-2').value),
    '1.5': parseFloat(document.getElementById('criteria-15').value),
    '1': parseFloat(document.getElementById('criteria-1').value),
    '0': 0
  };
  
  // ตรวจสอบว่าเกณฑ์เรียงลำดับถูกต้อง
  const gradeOrder = ['4', '3.5', '3', '2.5', '2', '1.5', '1'];
  for (let i = 0; i < gradeOrder.length - 1; i++) {
    if (criteria[gradeOrder[i]] <= criteria[gradeOrder[i + 1]]) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'เกณฑ์การตัดเกรดไม่ถูกต้อง เกณฑ์ต้องเรียงลำดับจากมากไปน้อย',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
  }
  
  // ตรวจสอบว่าฟังก์ชันมีอยู่จริงหรือไม่
  if (typeof google.script.run.setGradingCriteria !== 'function') {
    document.getElementById('criteria-modal-overlay').classList.remove('active');
    
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถบันทึกเกณฑ์การตัดเกรดได้: ฟังก์ชัน setGradingCriteria ไม่มีอยู่ในระบบ',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        // ปิด modal
        document.getElementById('criteria-modal-overlay').classList.remove('active');
        
        // โหลดเกณฑ์ใหม่
        loadGradingCriteria(currentSubject.subject_id);
        
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'ตั้งค่าเกณฑ์การตัดเกรดเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: response.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถตั้งค่าเกณฑ์การตัดเกรดได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .setGradingCriteria(sessionId, currentSubject.subject_id, criteria);
}

function exportGrades() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 google.script.run
   .withSuccessHandler(function(response) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (response.status === 'success') {
       // สร้างไฟล์ CSV และดาวน์โหลด
       downloadCSV(response.csv, `grades_${currentSubject.subject_code}_${currentSubject.class_name.replace(/\s+/g, '_')}.csv`);
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: response.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถส่งออกข้อมูลได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .exportToCsv(sessionId, 'class_grades', currentSubject.class_id);
}

function showTeacherProfile() {
  hideAllSections();
  document.getElementById('teacher-profile-content').classList.remove('hidden');
  setActiveMenuItem('menu-teacher-profile');
  
  // ตรวจสอบว่าฟังก์ชันมีอยู่จริงหรือไม่
  if (typeof google.script.run.getTeacherProfile !== 'function') {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลส่วนตัวได้: ฟังก์ชัน getTeacherProfile ไม่มีอยู่ในระบบ',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  // โหลดข้อมูลจาก Google Script
  google.script.run
    .withSuccessHandler(function(results) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (results.status === 'success') {
        const teacher = results.teacher;
        
        document.getElementById('teacher-profile-username').value = teacher.username || '';
        document.getElementById('teacher-profile-name').value = teacher.name || '';
        document.getElementById('teacher-profile-email').value = teacher.email || '';
        document.getElementById('teacher-profile-last-login').value = teacher.last_login ? formatDate(teacher.last_login) : '-';
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: results.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลส่วนตัวได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .getTeacherProfile(sessionId);
}

function showChangePasswordModal() {
 document.getElementById('change-password-form').reset();
 document.getElementById('change-password-modal-overlay').classList.add('active');
}

function changePassword() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password-input').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดกรอกรหัสผ่านปัจจุบัน, รหัสผ่านใหม่ และยืนยันรหัสผ่านใหม่',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  if (newPassword !== confirmPassword) {
    Swal.fire({
      icon: 'warning',
      title: 'รหัสผ่านไม่ตรงกัน',
      text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านใหม่ไม่ตรงกัน',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // ตรวจสอบว่าฟังก์ชันมีอยู่จริงหรือไม่
  if (typeof google.script.run.changePassword !== 'function') {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถเปลี่ยนรหัสผ่านได้: ฟังก์ชัน changePassword ไม่มีอยู่ในระบบ',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  google.script.run
    .withSuccessHandler(function(response) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      if (response.status === 'success') {
        // ปิด modal
        document.getElementById('change-password-modal-overlay').classList.remove('active');
        
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: response.message,
          confirmButtonText: 'ตกลง'
        });
      }
    })
    .withFailureHandler(function(error) {
      document.getElementById('loading-spinner').classList.add('hidden');
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + error.message,
        confirmButtonText: 'ตกลง'
      });
    })
    .changePassword(sessionId, currentPassword, newPassword);
}

// ฟังก์ชันสำหรับนักเรียน
function showStudentDashboard() {
 // ซ่อนเมนูสำหรับผู้ดูแลและครู
 document.getElementById('admin-menu').classList.add('hidden');
 document.getElementById('teacher-menu').classList.add('hidden');
 
 // แสดงเมนูสำหรับนักเรียน
 document.getElementById('student-menu').classList.remove('hidden');
 
 // แสดงหน้าผลการเรียน
 hideAllSections();
 document.getElementById('student-grades-content').classList.remove('hidden');
 
 // เลือกเมนูผลการเรียน
 setActiveMenuItem('menu-student-grades');
 
 // โหลดข้อมูลนักเรียน
 loadStudentInfo();
 
 // โหลดข้อมูลผลการเรียน
 loadStudentGradeInfo();
}

function loadStudentInfo() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(result) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (result.status === 'success') {
       // แสดงข้อมูลนักเรียน
       document.getElementById('student-name').textContent = result.student.name || '';
       document.getElementById('student-id').textContent = result.student.student_id || '';
       
       // แสดงรูปโปรไฟล์
       const profileImage = document.getElementById('profile-image');
       if (result.student.profile_image) {
         profileImage.src = result.student.profile_image;
         profileImage.style.display = 'block';
         document.getElementById('student-profile-image').querySelector('i')?.remove();
       } else {
         profileImage.style.display = 'none';
         if (!document.getElementById('student-profile-image').querySelector('i')) {
           const icon = document.createElement('i');
           icon.className = 'fas fa-user';
           document.getElementById('student-profile-image').appendChild(icon);
         }
       }
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: result.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getStudentInfo(sessionId);
}

function loadStudentGradeInfo() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(result) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (result.status === 'success') {
       // แสดง GPA
       document.getElementById('student-gpa').textContent = result.gpa;
       
       // แสดงข้อมูลเกรด
       renderStudentGradesList(result.grades || []);
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: result.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลผลการเรียนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getStudentGrades(sessionId);
}

function renderStudentGradesList(grades) {
 const tableBody = document.getElementById('student-grades-list');
 tableBody.innerHTML = '';
 
 if (grades.length === 0) {
   const row = document.createElement('tr');
   row.innerHTML = `
     <td colspan="6" style="text-align: center; padding: 20px; color: #7f8c8d;">ไม่พบข้อมูลผลการเรียน</td>
   `;
   tableBody.appendChild(row);
   return;
 }
 
 // เรียงตามประเภทวิชา
 grades.sort((a, b) => {
   if (a.subject_type < b.subject_type) return -1;
   if (a.subject_type > b.subject_type) return 1;
   return 0;
 });
 
 let currentType = '';
 
 grades.forEach(grade => {
   // สร้างแถวหัวข้อประเภทวิชา
   if (currentType !== grade.subject_type) {
     currentType = grade.subject_type;
     
     const headerRow = document.createElement('tr');
     headerRow.innerHTML = `
       <td colspan="6" style="font-weight: bold; background-color: #f5f5f5; padding: 8px 15px;">${currentType}</td>
     `;
     tableBody.appendChild(headerRow);
   }
   
   const row = document.createElement('tr');
   row.innerHTML = `
     <td>${grade.subject_code}</td>
     <td>${grade.subject_name}</td>
     <td>${grade.subject_type}</td>
     <td>${grade.credit}</td>
     <td>${grade.score}</td>
     <td>${grade.grade}</td>
   `;
   tableBody.appendChild(row);
 });
}

function uploadProfileImage() {
 const fileInput = document.getElementById('profile-upload');
 const file = fileInput.files[0];
 
 if (!file) {
   return;
 }
 
 // ตรวจสอบประเภทไฟล์
 if (!file.type.match('image.*')) {
   Swal.fire({
     icon: 'warning',
     title: 'ไฟล์ไม่ถูกต้อง',
     text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
     confirmButtonText: 'ตกลง'
   });
   return;
 }
 
 // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5 MB)
 if (file.size > 5 * 1024 * 1024) {
   Swal.fire({
     icon: 'warning',
     title: 'ไฟล์ขนาดใหญ่เกินไป',
     text: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
     confirmButtonText: 'ตกลง'
   });
   return;
 }
 
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // อ่านไฟล์และส่งข้อมูล
 const reader = new FileReader();
 reader.onload = function(e) {
   const imageData = e.target.result;
   
   google.script.run
     .withSuccessHandler(function(result) {
       document.getElementById('loading-spinner').classList.add('hidden');
       
       if (result.status === 'success') {
         // อัปเดตรูปโปรไฟล์
         const profileImage = document.getElementById('profile-image');
         profileImage.src = result.imageUrl;
         profileImage.style.display = 'block';
         document.getElementById('student-profile-image').querySelector('i')?.remove();
         
         // อัปเดตรูปโปรไฟล์ในหน้าข้อมูลส่วนตัว
         const profileImageDetail = document.getElementById('profile-image-detail');
         if (profileImageDetail) {
           profileImageDetail.src = result.imageUrl;
           profileImageDetail.style.display = 'block';
         }
         
         Swal.fire({
           icon: 'success',
           title: 'สำเร็จ',
           text: 'อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว',
           confirmButtonText: 'ตกลง'
         });
       } else {
         Swal.fire({
           icon: 'error',
           title: 'เกิดข้อผิดพลาด',
           text: result.message,
           confirmButtonText: 'ตกลง'
         });
       }
     })
     .withFailureHandler(function(error) {
       document.getElementById('loading-spinner').classList.add('hidden');
       
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้: ' + error.message,
         confirmButtonText: 'ตกลง'
       });
     })
     .updateProfileImage(sessionId, imageData);
 };
 
 reader.readAsDataURL(file);
}

function exportStudentGrades() {
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 google.script.run
   .withSuccessHandler(function(response) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (response.status === 'success') {
       // สร้างไฟล์ CSV และดาวน์โหลด
       downloadCSV(response.csv, `grades_${document.getElementById('student-id').textContent}.csv`);
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: response.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถส่งออกข้อมูลได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .exportToCsv(sessionId, 'student_grades');
}

function showStudentProfile() {
 hideAllSections();
 document.getElementById('student-profile-content').classList.remove('hidden');
 setActiveMenuItem('menu-student-profile');
 
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 // โหลดข้อมูลจาก Google Script
 google.script.run
   .withSuccessHandler(function(result) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     if (result.status === 'success') {
       const student = result.student;
       
       // แสดงข้อมูลนักเรียนครบถ้วน
       document.getElementById('profile-student-id').value = student.student_id || '';
       document.getElementById('profile-name').value = student.name || '';
       document.getElementById('profile-id-card').value = student.id_card || '';
       
       // เพิ่มฟิลด์ใหม่ (ถ้ามีใน HTML)
       const profileFatherNameElement = document.getElementById('profile-father-name');
       if (profileFatherNameElement) {
         profileFatherNameElement.value = student.father_name || '';
       }
       
       const profileMotherNameElement = document.getElementById('profile-mother-name');
       if (profileMotherNameElement) {
         profileMotherNameElement.value = student.mother_name || '';
       }
       
       const profileGuardianNameElement = document.getElementById('profile-guardian-name');
       if (profileGuardianNameElement) {
         profileGuardianNameElement.value = student.guardian_name || '';
       }
       
       const profilePhoneElement = document.getElementById('profile-phone');
       if (profilePhoneElement) {
         profilePhoneElement.value = student.phone || '';
       }
       
       const profileAddressElement = document.getElementById('profile-address');
       if (profileAddressElement) {
         profileAddressElement.value = student.address || '';
       }
       
       const profileBirthDateElement = document.getElementById('profile-birth-date');
       if (profileBirthDateElement) {
         profileBirthDateElement.value = student.birth_date || '';
       }
       
       // หาชื่อระดับชั้น
       let className = '-';
       const classObj = classes.find(cls => cls.class_id === student.class_id);
       if (classObj) {
         className = classObj.name;
       }
       document.getElementById('profile-class').value = className;
       
       // แสดงรูปโปรไฟล์
       const profileImage = document.getElementById('profile-image-detail');
       if (student.profile_image) {
         profileImage.src = student.profile_image;
         profileImage.style.display = 'block';
         profileImage.parentElement.querySelector('i')?.remove();
       } else {
         profileImage.style.display = 'none';
         if (!profileImage.parentElement.querySelector('i')) {
           const icon = document.createElement('i');
           icon.className = 'fas fa-user';
           profileImage.parentElement.appendChild(icon);
         }
       }
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: result.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถโหลดข้อมูลนักเรียนได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .getStudentInfo(sessionId);
}

// ฟังก์ชันลืมรหัสผ่าน
function showForgotPasswordModal() {
 document.getElementById('forgot-password-form').reset();
 document.getElementById('forgot-password-modal-overlay').classList.add('active');
}

function forgotPassword() {
 const username = document.getElementById('forgot-username').value;
 
 if (!username) {
   Swal.fire({
     icon: 'warning',
     title: 'กรุณากรอกชื่อผู้ใช้',
     text: 'โปรดระบุชื่อผู้ใช้ของคุณ',
     confirmButtonText: 'ตกลง'
   });
   return;
 }
 
 // แสดงหน้าโหลด
 document.getElementById('loading-spinner').classList.remove('hidden');
 
 google.script.run
   .withSuccessHandler(function(response) {
     document.getElementById('loading-spinner').classList.add('hidden');
     
     // ปิด modal
     document.getElementById('forgot-password-modal-overlay').classList.remove('active');
     
     if (response.status === 'success') {
       Swal.fire({
         icon: 'success',
         title: 'สำเร็จ',
         text: response.message,
         confirmButtonText: 'ตกลง'
       });
     } else {
       Swal.fire({
         icon: 'error',
         title: 'เกิดข้อผิดพลาด',
         text: response.message,
         confirmButtonText: 'ตกลง'
       });
     }
   })
   .withFailureHandler(function(error) {
     document.getElementById('loading-spinner').classList.add('hidden');
     document.getElementById('forgot-password-modal-overlay').classList.remove('active');
     
     Swal.fire({
       icon: 'error',
       title: 'เกิดข้อผิดพลาด',
       text: 'ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้: ' + error.message,
       confirmButtonText: 'ตกลง'
     });
   })
   .requestPasswordReset(username);
}

// ฟังก์ชัน Utilities
function toggleSideMenu() {
 const sideMenu = document.getElementById('side-menu');
 const mainContent = document.getElementById('main-content');
 const toggleIcon = document.querySelector('#toggle-menu i');
 
 if (sideMenu.classList.contains('collapsed')) {
   // ขยายเมนู
   sideMenu.classList.remove('collapsed');
   mainContent.classList.remove('expanded');
   toggleIcon.className = 'fas fa-angle-double-left';
 } else {
   // ย่อเมนู
   sideMenu.classList.add('collapsed');
   mainContent.classList.add('expanded');
   toggleIcon.className = 'fas fa-angle-double-right';
 }
}

function formatDate(dateString) {
 if (!dateString) return '-';
 
 const date = new Date(dateString);
 
 // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
 if (isNaN(date.getTime())) {
   return dateString;
 }
 
 return date.toLocaleDateString('th-TH', {
   year: 'numeric',
   month: 'short',
   day: 'numeric',
   hour: '2-digit',
   minute: '2-digit'
 });
}

function translateRole(role) {
 switch (role) {
   case 'admin':
     return 'ผู้ดูแลระบบ';
   case 'teacher':
     return 'ครูผู้สอน';
   case 'student':
     return 'นักเรียน';
   default:
     return role;
 }
}

function showAssignmentModal(isEdit = false) {
  document.getElementById('assignment-modal-title').textContent = isEdit ? 'แก้ไขการมอบหมายวิชา' : 'มอบหมายวิชา';
  document.getElementById('assignment-form').reset();
  document.getElementById('assignment-id').value = '';
  
  // ล้างการเลือกระดับชั้น
  const classCheckboxes = document.querySelectorAll('#classes-selection input[type="checkbox"]');
  classCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // ล้างการเลือกวิชา
  const subjectCheckboxes = document.querySelectorAll('#subjects-selection input[type="checkbox"]');
  subjectCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  updateClassSelection();
  updateSubjectSelection();
  updateAssignmentSummary();
  
  // แสดง modal
  document.getElementById('assignment-modal-overlay').classList.add('active');
}

function saveAssignment() {
  const assignmentId = document.getElementById('assignment-id').value;
  const teacherId = document.getElementById('assignment-teacher').value;
  
  // ดึงระดับชั้นที่เลือก
  const selectedClasses = [];
  const classCheckboxes = document.querySelectorAll('#classes-selection input[type="checkbox"]:checked');
  classCheckboxes.forEach(checkbox => {
    selectedClasses.push(checkbox.value);
  });
  
  // ดึงรายวิชาที่เลือก
  const selectedSubjects = [];
  const subjectCheckboxes = document.querySelectorAll('#subjects-selection input[type="checkbox"]:checked');
  subjectCheckboxes.forEach(checkbox => {
    selectedSubjects.push(checkbox.value);
  });
  
  if (!teacherId || selectedClasses.length === 0 || selectedSubjects.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดเลือกครูผู้สอน, ระดับชั้นอย่างน้อย 1 ชั้น และรายวิชาอย่างน้อย 1 วิชา',
      confirmButtonText: 'ตกลง'
    });
    return;
  }
  
  const totalAssignments = selectedClasses.length * selectedSubjects.length;
  
  // ยืนยันการมอบหมาย
  Swal.fire({
    title: 'ยืนยันการมอบหมาย',
    html: `
      <div style="text-align: left;">
        <p><strong>ครูผู้สอน:</strong> ${teachers.find(t => t.user_id === teacherId)?.name || ''}</p>
        <p><strong>ระดับชั้น:</strong> ${selectedClasses.length} ชั้น</p>
        <p><strong>รายวิชา:</strong> ${selectedSubjects.length} วิชา</p>
        <p><strong>การมอบหมายทั้งหมด:</strong> <span style="color: #dc3545; font-weight: bold;">${totalAssignments}</span> รายการ</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      performAssignments(teacherId, selectedClasses, selectedSubjects, assignmentId);
    }
  });
}

// ฟังก์ชันดำเนินการมอบหมาย
function performAssignments(teacherId, selectedClasses, selectedSubjects, assignmentId) {
  // แสดงหน้าโหลด
  document.getElementById('loading-spinner').classList.remove('hidden');
  
  if (assignmentId) {
    // แก้ไขการมอบหมายวิชา (ใช้ชั้นและวิชาแรกเท่านั้น)
    Swal.fire({
      icon: 'info',
      title: 'การแก้ไข',
      text: 'การแก้ไขจะใช้ระดับชั้นและวิชาแรกที่เลือกเท่านั้น',
      confirmButtonText: 'ตกลง'
    }).then(() => {
      google.script.run
        .withSuccessHandler(function(response) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          if (response.status === 'success') {
            document.getElementById('assignment-modal-overlay').classList.remove('active');
            showAssignmentsSection(); // รีโหลดข้อมูล
            
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ',
              text: 'แก้ไขการมอบหมายวิชาเรียบร้อยแล้ว',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: response.message,
              confirmButtonText: 'ตกลง'
            });
          }
        })
        .withFailureHandler(function(error) {
          document.getElementById('loading-spinner').classList.add('hidden');
          
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถแก้ไขการมอบหมายวิชาได้: ' + error.message,
            confirmButtonText: 'ตกลง'
          });
        })
        .updateAssignment(sessionId, assignmentId, teacherId, selectedClasses[0], selectedSubjects[0]);
    });
  } else {
    // เพิ่มการมอบหมายใหม่ (รองรับหลายชั้น × หลายวิชา)
    let successCount = 0;
    let errorCount = 0;
    let completedCount = 0;
    const totalAssignments = selectedClasses.length * selectedSubjects.length;
    
    // แสดง progress
    let progressHtml = `
      <div style="text-align: center;">
        <h4>กำลังมอบหมายวิชา...</h4>
        <div style="background-color: #f0f0f0; border-radius: 10px; padding: 3px; margin: 20px 0;">
          <div id="progress-bar" style="background-color: #28a745; height: 20px; border-radius: 7px; width: 0%; transition: width 0.3s;"></div>
        </div>
        <p id="progress-text">0 / ${totalAssignments} รายการ</p>
      </div>
    `;
    
    Swal.fire({
      title: 'กำลังดำเนินการ',
      html: progressHtml,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // มอบหมายแต่ละชั้น × แต่ละวิชา
    selectedClasses.forEach(classId => {
      selectedSubjects.forEach(subjectId => {
        google.script.run
          .withSuccessHandler(function(response) {
            completedCount++;
            
            if (response.status === 'success') {
              successCount++;
            } else {
              errorCount++;
              console.error('Assignment error:', response.message);
            }
            
            // อัปเดต progress
            const progressPercent = (completedCount / totalAssignments) * 100;
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = progressPercent + '%';
            if (progressText) progressText.textContent = `${completedCount} / ${totalAssignments} รายการ`;
            
            // ถ้าเสร็จหมดแล้ว
            if (completedCount === totalAssignments) {
              document.getElementById('loading-spinner').classList.add('hidden');
              
              setTimeout(() => {
                if (successCount > 0) {
                  document.getElementById('assignment-modal-overlay').classList.remove('active');
                  showAssignmentsSection(); // รีโหลดข้อมูล
                  
                  let message = `มอบหมายวิชาเรียบร้อยแล้ว ${successCount} รายการ`;
                  if (errorCount > 0) {
                    message += ` (ไม่สำเร็จ ${errorCount} รายการ)`;
                  }
                  
                  Swal.fire({
                    icon: successCount === totalAssignments ? 'success' : 'warning',
                    title: successCount === totalAssignments ? 'สำเร็จ' : 'สำเร็จบางส่วน',
                    html: `
                      <div style="text-align: left;">
                        <p><strong>สำเร็จ:</strong> ${successCount} รายการ</p>
                        ${errorCount > 0 ? `<p><strong style="color: #dc3545;">ไม่สำเร็จ:</strong> ${errorCount} รายการ</p>` : ''}
                      </div>
                    `,
                    confirmButtonText: 'ตกลง'
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถมอบหมายรายวิชาได้เลย',
                    confirmButtonText: 'ตกลง'
                  });
                }
              }, 500);
            }
          })
          .withFailureHandler(function(error) {
            completedCount++;
            errorCount++;
            console.error('Assignment failure:', error);
            
            // อัปเดต progress
            const progressPercent = (completedCount / totalAssignments) * 100;
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = progressPercent + '%';
            if (progressText) progressText.textContent = `${completedCount} / ${totalAssignments} รายการ`;
            
            // ถ้าเสร็จหมดแล้ว
            if (completedCount === totalAssignments) {
              document.getElementById('loading-spinner').classList.add('hidden');
              
              setTimeout(() => {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด',
                  html: `
                    <div style="text-align: left;">
                      <p><strong>สำเร็จ:</strong> ${successCount} รายการ</p>
                      <p><strong style="color: #dc3545;">ไม่สำเร็จ:</strong> ${errorCount} รายการ</p>
                    </div>
                  `,
                  confirmButtonText: 'ตกลง'
                });
              }, 500);
            }
          })
          .assignSubjectToTeacher(sessionId, teacherId, classId, subjectId);
      });
    });
  }
}


function downloadCSV(csvData, fileName) {
const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 
 // สร้าง URL สำหรับไฟล์
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', fileName);
 link.style.display = 'none';
 
 // เพิ่มลิงก์และคลิก
 document.body.appendChild(link);
 link.click();
 
 // ทำความสะอาด
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
 // เริ่มต้นแอพพลิเคชัน
 init();
 
 // ฟังก์ชันเข้าสู่ระบบ
 document.getElementById('login-form').addEventListener('submit', function(e) {
   e.preventDefault();
   login();
 });
 
 // ฟังก์ชันออกจากระบบ
 document.getElementById('menu-logout').addEventListener('click', function() {
   logout();
 });
 
 // ฟังก์ชันลืมรหัสผ่าน
 document.getElementById('forgot-password-link').addEventListener('click', function(e) {
   e.preventDefault();
   showForgotPasswordModal();
 });
 
 document.getElementById('forgot-password-btn').addEventListener('click', function() {
   forgotPassword();
 });
 
 // ฟังก์ชันรีเซ็ตรหัสผ่าน
 document.getElementById('confirm-reset-password').addEventListener('click', function() {
   confirmResetPassword();
 });
 
 // ปุ่มตั้งค่าระบบครั้งแรก
 document.getElementById('setup-system-btn').addEventListener('click', function() {
   setupSystemConfig();
 });
 
 // เมนูสำหรับผู้ดูแลระบบ
 document.getElementById('menu-dashboard').addEventListener('click', function() {
   hideAllSections();
   document.getElementById('admin-dashboard-content').classList.remove('hidden');
   setActiveMenuItem('menu-dashboard');
 });
 
 document.getElementById('menu-classes').addEventListener('click', function() {
   showClassesSection();
 });
 
 document.getElementById('menu-subjects').addEventListener('click', function() {
   showSubjectsSection();
 });
 
 document.getElementById('menu-teachers').addEventListener('click', function() {
   showTeachersSection();
 });
 
 document.getElementById('menu-students').addEventListener('click', function() {
   showStudentsSection();
 });
 
 document.getElementById('menu-assignments').addEventListener('click', function() {
   showAssignmentsSection();
 });
 
 document.getElementById('menu-password-resets').addEventListener('click', function() {
   showPasswordResetsSection();
 });
 
 document.getElementById('menu-settings').addEventListener('click', function() {
   showSettingsSection();
 });
 
 // Dashboard Cards
 document.getElementById('dash-classes').addEventListener('click', function() {
   showClassesSection();
 });
 
 document.getElementById('dash-subjects').addEventListener('click', function() {
   showSubjectsSection();
 });
 
 document.getElementById('dash-teachers').addEventListener('click', function() {
   showTeachersSection();
 });
 
 document.getElementById('dash-students').addEventListener('click', function() {
   showStudentsSection();
 });
 
 document.getElementById('dash-assignments').addEventListener('click', function() {
   showAssignmentsSection();
 });
 
 document.getElementById('dash-password-resets').addEventListener('click', function() {
   showPasswordResetsSection();
 });
 
 // เมนูสำหรับครูผู้สอน
 document.getElementById('menu-teacher-subjects').addEventListener('click', function() {
   hideAllSections();
   document.getElementById('teacher-subjects-content').classList.remove('hidden');
   setActiveMenuItem('menu-teacher-subjects');
   loadTeacherSubjects();
 });
 
 document.getElementById('menu-teacher-profile').addEventListener('click', function() {
   showTeacherProfile();
 });
 
 // เมนูสำหรับนักเรียน
 document.getElementById('menu-student-grades').addEventListener('click', function() {
   hideAllSections();
   document.getElementById('student-grades-content').classList.remove('hidden');
   setActiveMenuItem('menu-student-grades');
   loadStudentInfo();
   loadStudentGradeInfo();
 });
 
 document.getElementById('menu-student-profile').addEventListener('click', function() {
   showStudentProfile();
 });
 
 // เพิ่มระดับชั้น
 document.getElementById('add-class-btn').addEventListener('click', function() {
   showClassModal(false);
 });
 
 document.getElementById('save-class-btn').addEventListener('click', function() {
   saveClass();
 });
 
 // เพิ่มรายวิชา
 document.getElementById('add-subject-btn').addEventListener('click', function() {
   showSubjectModal(false);
 });
 
 document.getElementById('save-subject-btn').addEventListener('click', function() {
   saveSubject();
 });
 
 // เพิ่มครูผู้สอน
 document.getElementById('add-teacher-btn').addEventListener('click', function() {
   showTeacherModal(false);
 });
 
 document.getElementById('save-teacher-btn').addEventListener('click', function() {
   saveTeacher();
 });
 
 // เพิ่มนักเรียน
 document.getElementById('add-student-btn').addEventListener('click', function() {
   showStudentModal(false);
 });
 
 document.getElementById('save-student-btn').addEventListener('click', function() {
   saveStudent();
 });
 
 // กรองนักเรียนตามระดับชั้น
 document.getElementById('filter-class').addEventListener('change', function() {
   filterStudentsByClass();
 });
 
 // มอบหมายวิชา
 document.getElementById('add-assignment-btn').addEventListener('click', function() {
   showAssignmentModal();
 });
 
 document.getElementById('save-assignment-btn').addEventListener('click', function() {
   saveAssignment();
 });
 
 // บันทึกคะแนน
 document.getElementById('save-grade-btn').addEventListener('click', function() {
   saveGrade();
 });
 
 // ตั้งค่าเกณฑ์การตัดเกรด
 document.getElementById('set-criteria-btn').addEventListener('click', function() {
   showCriteriaModal();
 });
 
 document.getElementById('save-criteria-btn').addEventListener('click', function() {
   saveCriteria();
 });
 
 // ส่งออกเกรด
 document.getElementById('export-grades-btn').addEventListener('click', function() {
   exportGrades();
 });
 
 // ส่งออกเกรดนักเรียน
 document.getElementById('export-student-grades-btn').addEventListener('click', function() {
   exportStudentGrades();
 });
 
 // เปลี่ยนรหัสผ่าน
 document.getElementById('change-password-btn').addEventListener('click', function() {
   showChangePasswordModal();
 });
 
 document.getElementById('save-password-btn').addEventListener('click', function() {
   changePassword();
 });
 
 // อัปโหลดรูปโปรไฟล์
 document.getElementById('profile-upload').addEventListener('change', function() {
   uploadProfileImage();
 });
 
 document.getElementById('profile-upload-detail').addEventListener('change', function() {
   uploadProfileImage();
 });
 
 // บันทึกการตั้งค่า
 document.getElementById('settings-form').addEventListener('submit', function(e) {
   e.preventDefault();
   saveSettings();
 });
 
 // สลับเมนูด้านข้าง
 document.getElementById('toggle-menu').addEventListener('click', function() {
   toggleSideMenu();
 });

 document.getElementById('menu-students').addEventListener('click', function() {
  console.log('Students menu clicked');
  showStudentsSection();
});

// แก้ไขส่วน Dashboard Card
document.getElementById('dash-students').addEventListener('click', function() {
  console.log('Students dashboard card clicked');
  showStudentsSection();
});
 
 // ปิด Modal
 document.querySelectorAll('.modal-close').forEach(function(btn) {
   btn.addEventListener('click', function() {
     const modalOverlay = this.closest('.modal-overlay');
     if (modalOverlay) {
       modalOverlay.classList.remove('active');
     }
   });
 });
 
 // ตั้งค่าให้ responsive สำหรับอุปกรณ์มือถือ
 if (window.innerWidth <= 768) {
   toggleSideMenu();
 }
});

// Event Listeners สำหรับการค้นหานักเรียน
document.getElementById('search-student').addEventListener('input', function() {
  // ใช้ debounce เพื่อไม่ให้ค้นหาบ่อยเกินไป
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    handleStudentSearch();
  }, 300);
});

document.getElementById('search-student').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(this.searchTimeout);
    handleStudentSearch();
  }
});

// กรองตามระดับชั้น
document.getElementById('filter-class').addEventListener('change', function() {
  filterStudentsByClass();
});

// ล้างการค้นหา
document.getElementById('clear-search').addEventListener('click', function() {
  clearSearch();
});

// Event Listeners สำหรับการค้นหาครูผู้สอน
  document.getElementById('search-teacher').addEventListener('input', function() {
    // ใช้ debounce เพื่อไม่ให้ค้นหาบ่อยเกินไป
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      handleTeacherSearch();
    }, 300);
  });

  document.getElementById('search-teacher').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(this.searchTimeout);
      handleTeacherSearch();
    }
  });

  // ล้างการค้นหาครู
  document.getElementById('clear-teacher-search').addEventListener('click', function() {
    clearTeacherSearch();
  });
  
  document.getElementById('clear-teacher-search-btn').addEventListener('click', function() {
    clearTeacherSearch();
  });

  // Event Listeners สำหรับการมอบหมายวิชา
  document.getElementById('refresh-assignments-btn').addEventListener('click', function() {
    refreshAssignments();
  });
  
  document.getElementById('clear-assignment-filters').addEventListener('click', function() {
    clearAssignmentFilters();
  });
  
  document.getElementById('filter-assignment-teacher').addEventListener('change', function() {
    filterAssignments();
  });
  
  document.getElementById('filter-assignment-class').addEventListener('change', function() {
    filterAssignments();
  });
  
  document.getElementById('filter-assignment-subject').addEventListener('change', function() {
    filterAssignments();
  });


  </script>