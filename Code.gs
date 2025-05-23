// ตัวแปรระดับโปรแกรม
var SPREADSHEET_ID = '146gIRVwlBbPdS78UBAWY1WK4aEHnWaDI7QqcMzCKA3g'; // ใส่ ID ของ Google Sheets
var PROFILE_FOLDER_ID = '1SBMI0yFO-sxmfRJrkFYeUhsJGvsq6uKl'; // ใส่ ID ของโฟลเดอร์ที่จะเก็บรูปโปรไฟล์

/**
 * ฟังก์ชันเริ่มต้นที่จะทำงานเมื่อเปิด web app
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบบันทึกผลการเรียน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * ฟังก์ชันสำหรับรวม HTML ไฟล์อื่นๆ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ฟังก์ชันสำหรับการตั้งค่า sheets ใหม่ในระบบ
 */
function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(sheet) {
    return sheet.getName();
  });

  // สร้าง sheet Config ถ้ายังไม่มี
  if (sheetNames.indexOf('Config') === -1) {
    var configSheet = ss.insertSheet('Config');
    configSheet.appendRow(['config_json']);
    configSheet.appendRow([JSON.stringify({
      school_name: 'โรงเรียนตัวอย่าง',
      school_logo: '',
      school_description: 'ระบบบันทึกผลการเรียน',
      admin_email: '',
      profile_folder_id: PROFILE_FOLDER_ID || '',
      semester: '1/2566',
      grade_types: ['พื้นฐาน', 'เพิ่มเติม', 'เลือกเสรี', 'กิจกรรมพัฒนาผู้เรียน'],
      pass_score: 50 // คะแนนผ่านขั้นต่ำ
    })]);
  }

  // สร้าง sheet Users ถ้ายังไม่มี
  if (sheetNames.indexOf('Users') === -1) {
    var usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['user_json']);
    
    // สร้างผู้ใช้ admin คนแรก
    var adminUser = {
      user_id: Utilities.getUuid(),
      username: 'admin',
      password: hashPassword('admin123'),
      name: 'ผู้ดูแลระบบ',
      role: 'admin',
      email: '',
      created_at: new Date().toISOString(),
      last_login: null
    };
    
    usersSheet.appendRow([JSON.stringify(adminUser)]);
  }
  
  // สร้าง sheet Classes ถ้ายังไม่มี
  if (sheetNames.indexOf('Classes') === -1) {
    var classesSheet = ss.insertSheet('Classes');
    classesSheet.appendRow(['class_json']);
  }
  
  // สร้าง sheet Subjects ถ้ายังไม่มี
  if (sheetNames.indexOf('Subjects') === -1) {
    var subjectsSheet = ss.insertSheet('Subjects');
    subjectsSheet.appendRow(['subject_json']);
  }
  
  // สร้าง sheet TeacherAssignments ถ้ายังไม่มี
  if (sheetNames.indexOf('TeacherAssignments') === -1) {
    var teacherAssignmentsSheet = ss.insertSheet('TeacherAssignments');
    teacherAssignmentsSheet.appendRow(['assignment_json']);
  }
  
  // สร้าง sheet Grades ถ้ายังไม่มี
  if (sheetNames.indexOf('Grades') === -1) {
    var gradesSheet = ss.insertSheet('Grades');
    gradesSheet.appendRow(['grade_json']);
  }
  
  // สร้าง sheet PasswordResets ถ้ายังไม่มี
  if (sheetNames.indexOf('PasswordResets') === -1) {
    var passwordResetsSheet = ss.insertSheet('PasswordResets');
    passwordResetsSheet.appendRow(['reset_json']);
  }
  
  return {
    status: 'success',
    message: 'สร้าง sheets ทั้งหมดเรียบร้อยแล้ว'
  };
}

/**
 * ฟังก์ชันสำหรับแฮชรหัสผ่าน
 */
function hashPassword(password) {
  // ใช้ SHA-256 เพื่อแฮชรหัสผ่าน
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return Utilities.base64Encode(hash);
}

/**
 * ฟังก์ชันสำหรับเข้าสู่ระบบ
 */
function login(username, password) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if ((user.username === username || user.student_id === username || user.id_card === username) && user.password === hashPassword(password)) {
        // สร้าง Session ID
        var sessionId = Utilities.getUuid();
        
        // อัพเดทเวลาเข้าสู่ระบบล่าสุด
        user.last_login = new Date().toISOString();
        user.session_id = sessionId;
        
        // แน่ใจว่าข้อมูล JSON ถูกต้อง
        var userJson = JSON.stringify(user);
        sheet.getRange(i + 1, 1).setValue(userJson);
        
        // บันทึก log เพื่อตรวจสอบ
        console.log("Login successful for user:", username);
        console.log("Session ID created:", sessionId);
        console.log("User role:", user.role);
        
        return {
          status: 'success',
          message: 'เข้าสู่ระบบสำเร็จ',
          user: {
            user_id: user.user_id,
            name: user.name,
            role: user.role,
            session_id: sessionId
          }
        };
      }
    } catch (e) {
      // บันทึก log เมื่อพบข้อผิดพลาด
      console.log("Error during login processing:", e);
      // ข้าม JSON ที่ไม่ถูกต้อง
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
  };
}

/**
 * ฟังก์ชันตรวจสอบ session
 */
function checkSession(sessionId) {
  // เพิ่ม console.log เพื่อตรวจสอบค่า sessionId ที่ส่งมา
  console.log("Checking session ID:", sessionId);
  
  if (!sessionId) {
    return {
      status: 'error',
      message: 'session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่ (ไม่มี sessionId)'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if (user.session_id === sessionId) {
        return {
          status: 'success',
          user: {
            user_id: user.user_id,
            name: user.name,
            role: user.role
          }
        };
      }
    } catch (e) {
      console.log("Error parsing user data:", e);
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่'
  };
}

/**
 * ฟังก์ชันออกจากระบบ
 */
function logout(sessionId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if (user.session_id === sessionId) {
        // ลบ Session ID
        delete user.session_id;
        sheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
        
        return {
          status: 'success',
          message: 'ออกจากระบบสำเร็จ'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบ session'
  };
}

/**
 * ฟังก์ชันดึงการตั้งค่าระบบ
 */
function getConfig() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var configSheet = ss.getSheetByName('Config');
  var configData = configSheet.getDataRange().getValues();
  
  try {
    var config = JSON.parse(configData[1][0]);
    return {
      status: 'success',
      config: config
    };
  } catch (e) {
    return {
      status: 'error',
      message: 'ไม่สามารถอ่านข้อมูลการตั้งค่าได้'
    };
  }
}

/**
 * ฟังก์ชันบันทึกการตั้งค่าระบบ
 */
function saveConfig(sessionId, configData) {
  // ตรวจสอบสิทธิ์การเข้าถึง
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var configSheet = ss.getSheetByName('Config');
  
  // บันทึกข้อมูลการตั้งค่า
  configSheet.getRange(2, 1).setValue(JSON.stringify(configData));
  
  return {
    status: 'success',
    message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว'
  };
}

// ฟังก์ชันสำหรับผู้ดูแลระบบ
/**
 * ฟังก์ชันเพิ่มระดับชั้น
 */
function addClass(sessionId, className) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Classes');
  
  var classData = {
    class_id: Utilities.getUuid(),
    name: className,
    created_at: new Date().toISOString(),
    created_by: session.user.user_id
  };
  
  sheet.appendRow([JSON.stringify(classData)]);
  
  return {
    status: 'success',
    message: 'เพิ่มระดับชั้นสำเร็จ'
  };
}

/**
 * ฟังก์ชันเพิ่มรายวิชา
 */
function addSubject(sessionId, subjectData) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Subjects');
  
  var subjectObj = {
    subject_id: Utilities.getUuid(),
    name: subjectData.name,
    code: subjectData.code,
    type: subjectData.type,
    credit: subjectData.credit,
    created_at: new Date().toISOString(),
    created_by: session.user.user_id
  };
  
  sheet.appendRow([JSON.stringify(subjectObj)]);
  
  return {
    status: 'success',
    message: 'เพิ่มรายวิชาสำเร็จ'
  };
}

/**
 * ฟังก์ชันอัปโหลดรูปครูผู้สอน
 */
function uploadTeacherImage(sessionId, imageData, fileName) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  try {
    // แปลง base64 data URL เป็น Blob
    var base64Data = imageData.split(',')[1];
    var mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
    
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      fileName
    );
    
    // อัปโหลดรูปไปยังโฟลเดอร์
    var folder = DriveApp.getFolderById(PROFILE_FOLDER_ID);
    var file = folder.createFile(blob);
    
    return {
      status: 'success',
      message: 'อัปโหลดรูปภาพสำเร็จ',
      imageUrl: 'https://lh5.googleusercontent.com/d/' + file.getId(),
      fileId: file.getId()
    };
  } catch (e) {
    console.log('Error uploading teacher image:', e);
    return {
      status: 'error',
      message: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + e.message
    };
  }
}

/**
 * ฟังก์ชันเพิ่มครูผู้สอน (ปรับปรุง)
 */
function addTeacher(sessionId, teacherData) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  
  // สร้างรหัสผ่านเริ่มต้น
  var initialPassword = teacherData.password || Math.random().toString(36).substring(2, 10);
  
  var teacherObj = {
    user_id: Utilities.getUuid(),
    username: teacherData.username,
    password: hashPassword(initialPassword),
    name: teacherData.name,
    email: teacherData.email,
    phone: teacherData.phone || '', // เพิ่มฟิลด์ใหม่
    profile_image: teacherData.profile_image || '', // เพิ่มฟิลด์ใหม่
    role: 'teacher',
    created_at: new Date().toISOString(),
    created_by: session.user.user_id,
    last_login: null
  };
  
  sheet.appendRow([JSON.stringify(teacherObj)]);
  
  return {
    status: 'success',
    message: 'เพิ่มครูผู้สอนสำเร็จ',
    initialPassword: teacherData.password ? null : initialPassword
  };
}

/**
 * ฟังก์ชันอัปเดตข้อมูลครูผู้สอน (ปรับปรุง)
 */
function updateTeacher(sessionId, teacherId, teacherData) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!teacherData.username || !teacherData.name || !teacherData.email) {
    return {
      status: 'error',
      message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่ (ยกเว้นตัวเอง)
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if (user.user_id !== teacherId && user.username === teacherData.username) {
        return {
          status: 'error',
          message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  // อัปเดตข้อมูลครูผู้สอน
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if (user.user_id === teacherId) {
        // อัปเดตข้อมูล
        user.username = teacherData.username;
        user.name = teacherData.name;
        user.email = teacherData.email;
        user.phone = teacherData.phone || ''; // เพิ่มฟิลด์ใหม่
        if (teacherData.profile_image) {
          user.profile_image = teacherData.profile_image; // เพิ่มฟิลด์ใหม่
        }
        user.updated_at = new Date().toISOString();
        user.updated_by = session.user.user_id;
        
        // บันทึกข้อมูล
        sheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
        
        return {
          status: 'success',
          message: 'อัปเดตข้อมูลครูผู้สอนสำเร็จ'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลครูผู้สอน'
  };
}

/**
 * ฟังก์ชันมอบหมายวิชาให้ครู
 */
function assignSubjectToTeacher(sessionId, teacherId, classId, subjectId) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('TeacherAssignments');
  
  var assignmentObj = {
    assignment_id: Utilities.getUuid(),
    teacher_id: teacherId,
    class_id: classId,
    subject_id: subjectId,
    created_at: new Date().toISOString(),
    created_by: session.user.user_id
  };
  
  sheet.appendRow([JSON.stringify(assignmentObj)]);
  
  return {
    status: 'success',
    message: 'มอบหมายวิชาสำเร็จ'
  };
}

/**
 * ฟังก์ชันรีเซ็ตรหัสผ่านให้ครู
 */
function resetTeacherPassword(sessionId, teacherId) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    try {
      var user = JSON.parse(data[i][0]);
      if (user.user_id === teacherId) {
        // สร้างรหัสผ่านใหม่
        var newPassword = Math.random().toString(36).substring(2, 10);
        
        // อัพเดทรหัสผ่าน
        user.password = hashPassword(newPassword);
        sheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
        
        return {
          status: 'success',
          message: 'รีเซ็ตรหัสผ่านสำเร็จ',
          newPassword: newPassword
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบผู้ใช้'
  };
}

// ฟังก์ชันสำหรับครูผู้สอน
/**
 * ฟังก์ชันดึงรายวิชาที่รับผิดชอบ
 */
function getTeacherSubjects(sessionId) {
  // บันทึก log เพื่อตรวจสอบ
  console.log("Getting teacher subjects for session:", sessionId);
  
  var session = checkSession(sessionId);
  console.log("Session check result:", session);
  
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง: ' + session.message
    };
  }
  
  // ตรวจสอบว่าเป็นครูจริงหรือไม่
  if (session.user.role !== 'teacher') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง: ต้องเป็นครูผู้สอนเท่านั้น'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
  var assignmentsData = assignmentsSheet.getDataRange().getValues();
  
  var subjectsSheet = ss.getSheetByName('Subjects');
  var subjectsData = subjectsSheet.getDataRange().getValues();
  
  var classesSheet = ss.getSheetByName('Classes');
  var classesData = classesSheet.getDataRange().getValues();
  
  var teacherSubjects = [];
  
  for (var i = 1; i < assignmentsData.length; i++) {
    try {
      var assignment = JSON.parse(assignmentsData[i][0]);
      if (assignment.teacher_id === session.user.user_id) {
        // หาข้อมูลรายวิชา
        var subject = null;
        for (var j = 1; j < subjectsData.length; j++) {
          try {
            var subjectObj = JSON.parse(subjectsData[j][0]);
            if (subjectObj.subject_id === assignment.subject_id) {
              subject = subjectObj;
              break;
            }
          } catch (e) {
            console.log("Error parsing subject data:", e);
            continue;
          }
        }
        
        // หาข้อมูลระดับชั้น
        var classObj = null;
        for (var k = 1; k < classesData.length; k++) {
          try {
            var classDataObj = JSON.parse(classesData[k][0]);
            if (classDataObj.class_id === assignment.class_id) {
              classObj = classDataObj;
              break;
            }
          } catch (e) {
            console.log("Error parsing class data:", e);
            continue;
          }
        }
        
        if (subject && classObj) {
          teacherSubjects.push({
            assignment_id: assignment.assignment_id,
            subject_id: subject.subject_id,
            subject_name: subject.name,
            subject_code: subject.code,
            subject_type: subject.type,
            class_id: classObj.class_id,
            class_name: classObj.name
          });
        }
      }
    } catch (e) {
      console.log("Error processing assignment:", e);
      continue;
    }
  }
  
  console.log("Found teacher subjects:", teacherSubjects.length);
  
  return {
    status: 'success',
    subjects: teacherSubjects
  };
}

/**
 * ฟังก์ชันดึงรายชื่อนักเรียนในระดับชั้น
 */
function getClassStudents(sessionId, classId) {
  var session = checkSession(sessionId);
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  // ถ้าเป็นครู ต้องตรวจสอบว่าสอนในระดับชั้นนี้หรือไม่
  if (session.user.role === 'teacher') {
    var hasPermission = false;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
    var assignmentsData = assignmentsSheet.getDataRange().getValues();
    
    for (var i = 1; i < assignmentsData.length; i++) {
      try {
        var assignment = JSON.parse(assignmentsData[i][0]);
        if (assignment.teacher_id === session.user.user_id && assignment.class_id === classId) {
          hasPermission = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!hasPermission) {
      return {
        status: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงระดับชั้นนี้'
      };
    }
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  var students = [];
  
  for (var i = 1; i < usersData.length; i++) {
    try {
      var user = JSON.parse(usersData[i][0]);
      if (user.role === 'student' && user.class_id === classId) {
        students.push({
          user_id: user.user_id,
          student_id: user.student_id,
          name: user.name,
          profile_image: user.profile_image || ''
        });
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'success',
    students: students
  };
}

/**
 * ฟังก์ชันบันทึกผลการเรียน (ปรับปรุงเกณฑ์การตัดเกรด)
 */
function saveGrade(sessionId, studentId, subjectId, score) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'teacher') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  // ตรวจสอบว่าครูสอนวิชานี้หรือไม่
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
  var assignmentsData = assignmentsSheet.getDataRange().getValues();
  
  var hasPermission = false;
  for (var i = 1; i < assignmentsData.length; i++) {
    try {
      var assignment = JSON.parse(assignmentsData[i][0]);
      if (assignment.teacher_id === session.user.user_id && assignment.subject_id === subjectId) {
        hasPermission = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!hasPermission) {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึงรายวิชานี้'
    };
  }
  
  // ดึงข้อมูลวิชาเพื่อหาเกณฑ์การตัดเกรด
  var subjectsSheet = ss.getSheetByName('Subjects');
  var subjectsData = subjectsSheet.getDataRange().getValues();
  
  var subjectData = null;
  for (var i = 1; i < subjectsData.length; i++) {
    try {
      var subject = JSON.parse(subjectsData[i][0]);
      if (subject.subject_id === subjectId) {
        subjectData = subject;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!subjectData) {
    return {
      status: 'error',
      message: 'ไม่พบรายวิชา'
    };
  }
  
  // คำนวณเกรดตามเกณฑ์ใหม่
  var grade = calculateGrade(score, subjectId, subjectData.type);
  
  var gradesSheet = ss.getSheetByName('Grades');
  var gradesData = gradesSheet.getDataRange().getValues();
  
  // ตรวจสอบว่ามีเกรดของนักเรียนในวิชานี้แล้วหรือไม่
  var isExisting = false;
  for (var i = 1; i < gradesData.length; i++) {
    try {
      var gradeObj = JSON.parse(gradesData[i][0]);
      if (gradeObj.student_id === studentId && gradeObj.subject_id === subjectId) {
        // อัพเดทเกรดที่มีอยู่แล้ว
        gradeObj.score = score;
        gradeObj.grade = grade;
        gradeObj.updated_at = new Date().toISOString();
        gradeObj.updated_by = session.user.user_id;
        
        gradesSheet.getRange(i + 1, 1).setValue(JSON.stringify(gradeObj));
        isExisting = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  // ถ้ายังไม่มีเกรด ให้เพิ่มใหม่
  if (!isExisting) {
    var gradeObj = {
      grade_id: Utilities.getUuid(),
      student_id: studentId,
      subject_id: subjectId,
      score: score,
      grade: grade,
      created_at: new Date().toISOString(),
      created_by: session.user.user_id,
      updated_at: new Date().toISOString(),
      updated_by: session.user.user_id
    };
    
    gradesSheet.appendRow([JSON.stringify(gradeObj)]);
  }
  
  return {
    status: 'success',
    message: 'บันทึกผลการเรียนสำเร็จ',
    grade: grade
  };
}

/**
 * ฟังก์ชันคำนวณเกรดตามเกณฑ์ใหม่
 */
function calculateGrade(score, subjectId, subjectType) {
  // ถ้าเป็นกิจกรรมพัฒนาผู้เรียน
  if (subjectType === 'กิจกรรมพัฒนาผู้เรียน') {
    return score >= 50 ? 'ผ่าน' : 'ไม่ผ่าน';
  }
  
  // ดึงเกณฑ์การตัดเกรดของวิชานี้
  var criteria = getSubjectGradingCriteria(subjectId);
  
  // คำนวณเกรดตามเกณฑ์
  if (score >= criteria['4']) return '4';
  if (score >= criteria['3.5']) return '3.5';
  if (score >= criteria['3']) return '3';
  if (score >= criteria['2.5']) return '2.5';
  if (score >= criteria['2']) return '2';
  if (score >= criteria['1.5']) return '1.5';
  if (score >= criteria['1']) return '1';
  return '0';
}

function getSubjectGradingCriteria(subjectId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var criteriaSheet = ss.getSheetByName('GradingCriteria');
  
  // ถ้ายังไม่มี sheet GradingCriteria ให้ใช้เกณฑ์มาตรฐาน
  if (!criteriaSheet) {
    return {
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
  
  var criteriaData = criteriaSheet.getDataRange().getValues();
  
  // หาเกณฑ์ของรายวิชา
  for (var i = 1; i < criteriaData.length; i++) {
    try {
      var criteriaObj = JSON.parse(criteriaData[i][0]);
      if (criteriaObj.subject_id === subjectId) {
        return criteriaObj.grading_criteria;
      }
    } catch (e) {
      continue;
    }
  }
  
  // ถ้าไม่พบเกณฑ์สำหรับรายวิชานี้ ให้ใช้เกณฑ์มาตรฐาน
  return {
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

/**
 * ฟังก์ชันขอรีเซ็ตรหัสผ่าน
 */
function requestPasswordReset(username) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  var user = null;
  for (var i = 1; i < usersData.length; i++) {
    try {
      var userData = JSON.parse(usersData[i][0]);
      if (userData.username === username && userData.role === 'teacher') {
        user = userData;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!user) {
    return {
      status: 'error',
      message: 'ไม่พบบัญชีผู้ใช้'
    };
  }
  
  var resetSheet = ss.getSheetByName('PasswordResets');
  
  var resetObj = {
    reset_id: Utilities.getUuid(),
    user_id: user.user_id,
    requested_at: new Date().toISOString(),
    status: 'pending'
  };
  
  resetSheet.appendRow([JSON.stringify(resetObj)]);
  
  return {
    status: 'success',
    message: 'ส่งคำขอรีเซ็ตรหัสผ่านสำเร็จ โปรดติดต่อผู้ดูแลระบบ'
  };
}

/**
* ฟังก์ชันดึงคำขอรีเซ็ตรหัสผ่าน
*/
function getPasswordResetRequests(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var resetSheet = ss.getSheetByName('PasswordResets');
 var resetData = resetSheet.getDataRange().getValues();
 
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 var requests = [];
 
 for (var i = 1; i < resetData.length; i++) {
   try {
     var resetObj = JSON.parse(resetData[i][0]);
     if (resetObj.status === 'pending') {
       // หาข้อมูลผู้ใช้
       var user = null;
       for (var j = 1; j < usersData.length; j++) {
         try {
           var userData = JSON.parse(usersData[j][0]);
           if (userData.user_id === resetObj.user_id) {
             user = userData;
             break;
           }
         } catch (e) {
           continue;
         }
       }
       
       if (user) {
         requests.push({
           reset_id: resetObj.reset_id,
           user_id: user.user_id,
           username: user.username,
           name: user.name,
           requested_at: resetObj.requested_at
         });
       }
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   requests: requests
 };
}

/**
* ฟังก์ชันเพิ่มนักเรียน (ปรับปรุงเพื่อรองรับข้อมูลเพิ่มเติม)
*/
function addStudent(sessionId, studentData) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบข้อมูลที่จำเป็น
 if (!studentData.student_id || !studentData.name || !studentData.class_id) {
   return {
     status: 'error',
     message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var sheet = ss.getSheetByName('Users');
 
 // ตรวจสอบว่ารหัสนักเรียนซ้ำหรือไม่
 var data = sheet.getDataRange().getValues();
 for (var i = 1; i < data.length; i++) {
   try {
     var user = JSON.parse(data[i][0]);
     if (user.student_id === studentData.student_id) {
       return {
         status: 'error',
         message: 'รหัสนักเรียนนี้มีอยู่ในระบบแล้ว'
       };
     }
     if (studentData.id_card && user.id_card === studentData.id_card) {
       return {
         status: 'error',
         message: 'เลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 // สร้างรหัสผ่านเริ่มต้น
 var initialPassword = studentData.student_id;
 
 // กำหนดค่าเริ่มต้นสำหรับฟิลด์ที่อาจเป็น null
 var studentObj = {
   user_id: Utilities.getUuid(),
   username: studentData.student_id,
   password: hashPassword(initialPassword),
   student_id: studentData.student_id,
   id_card: studentData.id_card || '',
   name: studentData.name,
   father_name: studentData.father_name || '',        // เพิ่มชื่อบิดา
   mother_name: studentData.mother_name || '',        // เพิ่มชื่อมารดา
   guardian_name: studentData.guardian_name || '',    // เพิ่มชื่อผู้ปกครอง
   phone: studentData.phone || '',                    // เพิ่มเบอร์โทร
   address: studentData.address || '',                // เพิ่มที่อยู่
   birth_date: studentData.birth_date || '',          // เพิ่มวันเกิด
   class_id: studentData.class_id,
   role: 'student',
   profile_image: studentData.profile_image || '',    // เพิ่มรูปโปรไฟล์
   created_at: new Date().toISOString(),
   created_by: session.user.user_id,
   last_login: null
 };
 
 sheet.appendRow([JSON.stringify(studentObj)]);
 
 return {
   status: 'success',
   message: 'เพิ่มนักเรียนสำเร็จ'
 };
}

/**
* ฟังก์ชันอัปโหลดรูปนักเรียน (แก้ไข URL)
*/
function uploadStudentImage(sessionId, imageData, fileName) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 try {
   // แปลง base64 data URL เป็น Blob
   var base64Data = imageData.split(',')[1]; // ตัด "data:image/jpeg;base64," ออก
   var mimeType = imageData.split(',')[0].split(':')[1].split(';')[0]; // ดึง MIME type
   
   // สร้าง Blob จาก base64
   var blob = Utilities.newBlob(
     Utilities.base64Decode(base64Data),
     mimeType,
     fileName
   );
   
   // ใช้โฟลเดอร์ที่กำหนดไว้
   var folder = DriveApp.getFolderById(PROFILE_FOLDER_ID);
   var file = folder.createFile(blob);
   
   return {
     status: 'success',
     message: 'อัปโหลดรูปภาพสำเร็จ',
     imageUrl: 'https://lh5.googleusercontent.com/d/' + file.getId(),
     fileId: file.getId()
   };
 } catch (e) {
   console.log('Error uploading image:', e);
   return {
     status: 'error',
     message: 'ไม่สามารถอัปโหลดรูปภาพได้: ' + e.message
   };
 }
}


/**
* ฟังก์ชันอัปเดตรูปโปรไฟล์นักเรียน (แก้ไข URL)
*/
function updateStudentProfileImage(sessionId, studentId, imageData, fileName) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 try {
   // แปลง base64 data URL เป็น Blob
   var base64Data = imageData.split(',')[1];
   var mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
   
   var blob = Utilities.newBlob(
     Utilities.base64Decode(base64Data),
     mimeType,
     fileName
   );
   
   // อัปโหลดรูปไปยังโฟลเดอร์
   var folder = DriveApp.getFolderById(PROFILE_FOLDER_ID);
   var file = folder.createFile(blob);
   
   var imageUrl = 'https://lh5.googleusercontent.com/d/' + file.getId();
   
   // อัปเดตข้อมูลนักเรียน
   var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   var usersSheet = ss.getSheetByName('Users');
   var usersData = usersSheet.getDataRange().getValues();
   
   for (var i = 1; i < usersData.length; i++) {
     try {
       var user = JSON.parse(usersData[i][0]);
       if (user.user_id === studentId && user.role === 'student') {
         // ลบรูปเดิม (ถ้ามี)
         if (user.profile_image && user.profile_image.includes('googleusercontent.com')) {
           try {
             var oldFileId = user.profile_image.split('/d/')[1];
             if (oldFileId) {
               DriveApp.getFileById(oldFileId).setTrashed(true);
             }
           } catch (e) {
             console.log('Cannot delete old image:', e);
           }
         }
         
         // อัปเดต URL รูปโปรไฟล์
         user.profile_image = imageUrl;
         user.updated_at = new Date().toISOString();
         user.updated_by = session.user.user_id;
         
         usersSheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
         
         return {
           status: 'success',
           message: 'อัปเดตรูปโปรไฟล์นักเรียนสำเร็จ',
           imageUrl: imageUrl
         };
       }
     } catch (e) {
       continue;
     }
   }
   
   return {
     status: 'error',
     message: 'ไม่พบข้อมูลนักเรียน'
   };
   
 } catch (e) {
   console.log('Error updating student profile image:', e);
   return {
     status: 'error',
     message: 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้: ' + e.message
   };
 }
}

/**
* ฟังก์ชันตรวจสอบและสร้างโฟลเดอร์โปรไฟล์ (เพิ่มใหม่)
*/
function checkAndCreateProfileFolder() {
 try {
   // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่
   var folder = DriveApp.getFolderById(PROFILE_FOLDER_ID);
   return {
     status: 'success',
     message: 'โฟลเดอร์โปรไฟล์พร้อมใช้งาน',
     folderId: PROFILE_FOLDER_ID
   };
 } catch (e) {
   // ถ้าไม่มีโฟลเดอร์ ให้สร้างใหม่
   try {
     var newFolder = DriveApp.createFolder('Student_Profiles_' + new Date().getTime());
     
     // อัปเดต config
     var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
     var configSheet = ss.getSheetByName('Config');
     var configData = configSheet.getDataRange().getValues();
     
     if (configData.length > 1) {
       var config = JSON.parse(configData[1][0]);
       config.profile_folder_id = newFolder.getId();
       configSheet.getRange(2, 1).setValue(JSON.stringify(config));
     }
     
     return {
       status: 'success',
       message: 'สร้างโฟลเดอร์โปรไฟล์ใหม่แล้ว',
       folderId: newFolder.getId()
     };
   } catch (e2) {
     return {
       status: 'error',
       message: 'ไม่สามารถสร้างโฟลเดอร์โปรไฟล์ได้: ' + e2.message
     };
   }
 }
}

/**
* ฟังก์ชันอัปเดตรูปโปรไฟล์ (แก้ไข URL)
*/
function updateProfileImage(sessionId, imageData) {
  var session = checkSession(sessionId);
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  try {
    // แปลง base64 data URL เป็น Blob
    var base64Data = imageData.split(',')[1]; // ตัด "data:image/jpeg;base64," ออก
    var mimeType = imageData.split(',')[0].split(':')[1].split(';')[0]; // ดึง MIME type
    
    // สร้าง Blob จาก base64
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      'profile_' + session.user.user_id + '_' + new Date().getTime()
    );
    
    // ดึงข้อมูล Config
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var configSheet = ss.getSheetByName('Config');
    var configData = configSheet.getDataRange().getValues();
    
    var config = null;
    try {
      config = JSON.parse(configData[1][0]);
    } catch (e) {
      return {
        status: 'error',
        message: 'ไม่พบข้อมูลการตั้งค่า'
      };
    }
    
    // ตรวจสอบว่ามีโฟลเดอร์สำหรับเก็บรูปโปรไฟล์หรือไม่
    var profileFolderId = config.profile_folder_id || PROFILE_FOLDER_ID;
    if (!profileFolderId) {
      return {
        status: 'error',
        message: 'ไม่พบโฟลเดอร์สำหรับเก็บรูปโปรไฟล์'
      };
    }
    
    // อัปโหลดรูปไปยังโฟลเดอร์
    var folder = DriveApp.getFolderById(profileFolderId);
    var file = folder.createFile(blob);
    
    var imageUrl = 'https://lh5.googleusercontent.com/d/' + file.getId();
    
    // อัปเดตข้อมูลผู้ใช้
    var usersSheet = ss.getSheetByName('Users');
    var usersData = usersSheet.getDataRange().getValues();
    
    for (var i = 1; i < usersData.length; i++) {
      try {
        var user = JSON.parse(usersData[i][0]);
        if (user.user_id === session.user.user_id) {
          // ลบรูปเดิม (ถ้ามี)
          if (user.profile_image && user.profile_image.includes('googleusercontent.com')) {
            try {
              var oldFileId = user.profile_image.split('/d/')[1];
              if (oldFileId) {
                DriveApp.getFileById(oldFileId).setTrashed(true);
              }
            } catch (e) {
              console.log('Cannot delete old image:', e);
            }
          }
          
          // อัปเดต URL รูปโปรไฟล์
          user.profile_image = imageUrl;
          user.updated_at = new Date().toISOString();
          usersSheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
          
          return {
            status: 'success',
            message: 'อัปเดตรูปโปรไฟล์สำเร็จ',
            imageUrl: imageUrl
          };
        }
      } catch (e) {
        console.log('Error updating user profile:', e);
        continue;
      }
    }
    
    return {
      status: 'error',
      message: 'ไม่พบข้อมูลผู้ใช้'
    };
    
  } catch (e) {
    console.log('Error in updateProfileImage:', e);
    return {
      status: 'error',
      message: 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้: ' + e.message
    };
  }
}

/**
* ฟังก์ชันดึงข้อมูลผลการเรียนของนักเรียน
*/
function getStudentGrades(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var userId = session.user.user_id;
 
 // ถ้าเป็นนักเรียน ดูได้เฉพาะเกรดของตัวเอง
 // ถ้าเป็นผู้ดูแลระบบหรือครู ต้องระบุ studentId เพิ่มเติม
 var studentId = null;
 if (session.user.role === 'student') {
   // ดึง studentId ของนักเรียนที่กำลังเข้าระบบ
   var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   var usersSheet = ss.getSheetByName('Users');
   var usersData = usersSheet.getDataRange().getValues();
   
   for (var i = 1; i < usersData.length; i++) {
     try {
       var user = JSON.parse(usersData[i][0]);
       if (user.user_id === userId) {
         studentId = user.user_id;
         break;
       }
     } catch (e) {
       continue;
     }
   }
 } else {
   return {
     status: 'error',
     message: 'ต้องระบุรหัสนักเรียนสำหรับครูหรือผู้ดูแลระบบ'
   };
 }
 
 if (!studentId) {
   return {
     status: 'error',
     message: 'ไม่พบข้อมูลนักเรียน'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var gradesSheet = ss.getSheetByName('Grades');
 var gradesData = gradesSheet.getDataRange().getValues();
 
 var subjectsSheet = ss.getSheetByName('Subjects');
 var subjectsData = subjectsSheet.getDataRange().getValues();
 
 var grades = [];
 
 for (var i = 1; i < gradesData.length; i++) {
   try {
     var grade = JSON.parse(gradesData[i][0]);
     if (grade.student_id === studentId) {
       // หาข้อมูลรายวิชา
       var subject = null;
       for (var j = 1; j < subjectsData.length; j++) {
         try {
           var subjectObj = JSON.parse(subjectsData[j][0]);
           if (subjectObj.subject_id === grade.subject_id) {
             subject = subjectObj;
             break;
           }
         } catch (e) {
           continue;
         }
       }
       
       if (subject) {
         grades.push({
           subject_name: subject.name,
           subject_code: subject.code,
           subject_type: subject.type,
           credit: subject.credit,
           score: grade.score,
           grade: grade.grade,
           is_activity: subject.type === 'กิจกรรมพัฒนาผู้เรียน'
         });
       }
     }
   } catch (e) {
     continue;
   }
 }
 
 // คำนวณเกรดเฉลี่ย (GPA)
 var totalCredit = 0;
 var totalCreditPoints = 0;
 
 for (var i = 0; i < grades.length; i++) {
   // ข้ามกิจกรรมพัฒนาผู้เรียน
   if (grades[i].is_activity) {
     continue;
   }
   
   var credit = parseFloat(grades[i].credit);
   totalCredit += credit;
   
   // คำนวณแต้มคะแนนตามคะแนนที่ได้ (ไม่ใช้เกรด)
   var score = grades[i].score;
   var creditPoint = (score / 100) * 4; // คำนวณเป็นสัดส่วนของ 4.00
   totalCreditPoints += (credit * creditPoint);
 }
 
 var gpa = totalCredit > 0 ? (totalCreditPoints / totalCredit).toFixed(2) : '0.00';
 
 return {
   status: 'success',
   grades: grades,
   gpa: gpa
 };
}

/**
* ฟังก์ชันส่งออกข้อมูลเป็น CSV
*/
function exportToCsv(sessionId, type, id) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var data = [];
 
 if (type === 'student_grades') {
   // ส่งออกเกรดของนักเรียนคนเดียว
   if (session.user.role === 'student' && !id) {
     // ถ้าเป็นนักเรียนและไม่ได้ระบุ id ให้ใช้ id ของนักเรียนที่กำลังเข้าระบบ
     id = session.user.user_id;
   }
   
   if (!id) {
     return {
       status: 'error',
       message: 'ต้องระบุรหัสนักเรียน'
     };
   }
   
   // ดึงข้อมูลนักเรียน
   var usersSheet = ss.getSheetByName('Users');
   var usersData = usersSheet.getDataRange().getValues();
   
   var student = null;
   for (var i = 1; i < usersData.length; i++) {
     try {
       var user = JSON.parse(usersData[i][0]);
       if ((user.user_id === id || user.student_id === id) && user.role === 'student') {
         student = user;
         break;
       }
     } catch (e) {
       continue;
     }
   }
   
   if (!student) {
     return {
       status: 'error',
       message: 'ไม่พบข้อมูลนักเรียน'
     };
   }
   
   // ดึงเกรดของนักเรียน
   var gradesSheet = ss.getSheetByName('Grades');
   var gradesData = gradesSheet.getDataRange().getValues();
   
   var subjectsSheet = ss.getSheetByName('Subjects');
   var subjectsData = subjectsSheet.getDataRange().getValues();
   
   // สร้างข้อมูลส่วนหัว
   data.push(['รหัสนักเรียน', student.student_id]);
   data.push(['ชื่อ-นามสกุล', student.name]);
   data.push(['']);
   data.push(['รหัสวิชา', 'ชื่อวิชา', 'ประเภท', 'หน่วยกิต', 'คะแนน', 'ผลการเรียน']);
   
   // สร้างข้อมูลเกรด
   var grades = [];
   for (var i = 1; i < gradesData.length; i++) {
     try {
       var grade = JSON.parse(gradesData[i][0]);
       if (grade.student_id === student.user_id) {
         // หาข้อมูลรายวิชา
         var subject = null;
         for (var j = 1; j < subjectsData.length; j++) {
           try {
             var subjectObj = JSON.parse(subjectsData[j][0]);
             if (subjectObj.subject_id === grade.subject_id) {
               subject = subjectObj;
               break;
             }
           } catch (e) {
             continue;
           }
         }
         
         if (subject) {
           grades.push([
             subject.code,
             subject.name,
             subject.type,
             subject.credit,
             grade.score,
             grade.grade
           ]);
         }
       }
     } catch (e) {
       continue;
     }
   }
   
   // เรียงลำดับตามประเภทวิชา
   grades.sort(function(a, b) {
     if (a[2] < b[2]) return -1;
     if (a[2] > b[2]) return 1;
     return 0;
   });
   
   // เพิ่มข้อมูลเกรดลงใน data
   for (var i = 0; i < grades.length; i++) {
     data.push(grades[i]);
   }
   
   // คำนวณเกรดเฉลี่ย
   var totalCredit = 0;
   var totalCreditPoints = 0;
   
   for (var i = 0; i < grades.length; i++) {
     // ข้ามกิจกรรมพัฒนาผู้เรียน
     if (grades[i][2] === 'กิจกรรมพัฒนาผู้เรียน') {
       continue;
     }
     
     var credit = parseFloat(grades[i][3]);
     totalCredit += credit;
     
     // คำนวณแต้มคะแนนตามคะแนนที่ได้ (ไม่ใช้เกรด)
     var score = parseFloat(grades[i][4]);
     var creditPoint = (score / 100) * 4; // คำนวณเป็นสัดส่วนของ 4.00
     totalCreditPoints += (credit * creditPoint);
   }
   
   var gpa = totalCredit > 0 ? (totalCreditPoints / totalCredit).toFixed(2) : '0.00';
   
   // เพิ่มข้อมูลเกรดเฉลี่ย
   data.push(['']);
   data.push(['GPA', gpa]);
 } else if (type === 'class_grades') {
   // ส่งออกเกรดของนักเรียนทั้งชั้น
   if (session.user.role !== 'admin' && session.user.role !== 'teacher') {
     return {
       status: 'error',
       message: 'ไม่มีสิทธิ์เข้าถึง'
     };
   }
   
   if (!id) {
     return {
       status: 'error',
       message: 'ต้องระบุรหัสชั้นเรียน'
     };
   }
   
   // ดึงข้อมูลชั้นเรียน
   var classesSheet = ss.getSheetByName('Classes');
   var classesData = classesSheet.getDataRange().getValues();
   
   var classObj = null;
   for (var i = 1; i < classesData.length; i++) {
     try {
       var cls = JSON.parse(classesData[i][0]);
       if (cls.class_id === id) {
         classObj = cls;
         break;
       }
     } catch (e) {
       continue;
     }
   }
   
   if (!classObj) {
     return {
       status: 'error',
       message: 'ไม่พบข้อมูลชั้นเรียน'
     };
   }
   
   // ดึงข้อมูลนักเรียนในชั้น
   var usersSheet = ss.getSheetByName('Users');
   var usersData = usersSheet.getDataRange().getValues();
   
   var students = [];
   for (var i = 1; i < usersData.length; i++) {
     try {
       var user = JSON.parse(usersData[i][0]);
       if (user.role === 'student' && user.class_id === id) {
         students.push(user);
       }
     } catch (e) {
       continue;
     }
   }
   
   // สร้างข้อมูลส่วนหัว
   data.push(['ระดับชั้น', classObj.name]);
   data.push(['']);
   data.push(['รหัสนักเรียน', 'ชื่อ-นามสกุล', 'คะแนนเฉลี่ย', 'สถานะ']);
   
   // ดึงเกรดของนักเรียนแต่ละคน
   var gradesSheet = ss.getSheetByName('Grades');
   var gradesData = gradesSheet.getDataRange().getValues();
   
   var subjectsSheet = ss.getSheetByName('Subjects');
   var subjectsData = subjectsSheet.getDataRange().getValues();
   
   for (var i = 0; i < students.length; i++) {
     var studentGrades = [];
     
     for (var j = 1; j < gradesData.length; j++) {
       try {
         var grade = JSON.parse(gradesData[j][0]);
         if (grade.student_id === students[i].user_id) {
           // หาข้อมูลรายวิชา
           for (var k = 1; k < subjectsData.length; k++) {
             try {
               var subject = JSON.parse(subjectsData[k][0]);
               if (subject.subject_id === grade.subject_id) {
                 studentGrades.push({
                   credit: parseFloat(subject.credit),
                   score: grade.score,
                   type: subject.type
                 });
                 break;
               }
             } catch (e) {
               continue;
             }
           }
         }
       } catch (e) {
         continue;
       }
     }
     
     // คำนวณคะแนนเฉลี่ย
     var totalCredit = 0;
     var totalScore = 0;
     var totalSubjects = 0;
     
     for (var j = 0; j < studentGrades.length; j++) {
       // ข้ามกิจกรรมพัฒนาผู้เรียน
       if (studentGrades[j].type === 'กิจกรรมพัฒนาผู้เรียน') {
         continue;
       }
       
       totalCredit += studentGrades[j].credit;
       totalScore += (studentGrades[j].score * studentGrades[j].credit);
       totalSubjects++;
     }
     
     var avgScore = totalSubjects > 0 ? (totalScore / totalCredit).toFixed(2) : '0.00';
     var passStatus = parseFloat(avgScore) >= 50 ? 'ผ่าน' : 'ไม่ผ่าน';
     
     data.push([students[i].student_id, students[i].name, avgScore, passStatus]);
   }
 } else {
   return {
     status: 'error',
     message: 'ประเภทข้อมูลไม่ถูกต้อง'
   };
 }
 
 // แปลงข้อมูลเป็น CSV
 var csv = '';
 for (var i = 0; i < data.length; i++) {
   var row = '';
   for (var j = 0; j < data[i].length; j++) {
     var cell = data[i][j].toString();
     // ครอบด้วยเครื่องหมายคำพูดถ้ามีเครื่องหมายคอมม่า
     if (cell.indexOf(',') !== -1) {
       cell = '"' + cell + '"';
     }
     row += cell;
     if (j < data[i].length - 1) {
       row += ',';
     }
   }
   csv += row + '\n';
 }
 
 return {
   status: 'success',
   csv: csv
 };
}

/**
* ฟังก์ชันดึงข้อมูลระดับชั้นทั้งหมด
*/
function getClasses(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var classesSheet = ss.getSheetByName('Classes');
 var classesData = classesSheet.getDataRange().getValues();
 
 var classes = [];
 
 for (var i = 1; i < classesData.length; i++) {
   try {
     var classObj = JSON.parse(classesData[i][0]);
     
     // นับจำนวนนักเรียนในแต่ละชั้น
     var student_count = 0;
     var usersSheet = ss.getSheetByName('Users');
     var usersData = usersSheet.getDataRange().getValues();
     
     for (var j = 1; j < usersData.length; j++) {
       try {
         var user = JSON.parse(usersData[j][0]);
         if (user.role === 'student' && user.class_id === classObj.class_id) {
           student_count++;
         }
       } catch (e) {
         continue;
       }
     }
     
     classObj.student_count = student_count;
     classes.push(classObj);
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   classes: classes
 };
}

/**
* ฟังก์ชันดึงข้อมูลรายวิชาทั้งหมด
*/
function getSubjects(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var subjectsSheet = ss.getSheetByName('Subjects');
 var subjectsData = subjectsSheet.getDataRange().getValues();
 
 var subjects = [];
 
 for (var i = 1; i < subjectsData.length; i++) {
   try {
     var subject = JSON.parse(subjectsData[i][0]);
     subjects.push(subject);
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   subjects: subjects
 };
}

/**
* ฟังก์ชันดึงข้อมูลครูผู้สอนทั้งหมด
*/
function getTeachers(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 var teachers = [];
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.role === 'teacher') {
       // ไม่ส่งข้อมูลรหัสผ่านกลับไป
       delete user.password;
       delete user.session_id;
       teachers.push(user);
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   teachers: teachers
 };
}

/**
* ฟังก์ชันดึงข้อมูลนักเรียนทั้งหมดหรือตามระดับชั้น (ปรับปรุงให้ส่งข้อมูลครบ)
*/
function getStudents(sessionId, classId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 var students = [];
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.role === 'student') {
       // กรองตามระดับชั้น
       if (classId && user.class_id !== classId) {
         continue;
       }
       
       // ส่งข้อมูลครบทุกฟิลด์ (ไม่ส่งรหัสผ่าน)
       var studentData = {
         user_id: user.user_id,
         student_id: user.student_id || '',
         id_card: user.id_card || '',
         name: user.name || '',
         father_name: user.father_name || '',
         mother_name: user.mother_name || '',
         guardian_name: user.guardian_name || '',
         phone: user.phone || '',
         address: user.address || '',
         birth_date: user.birth_date || '',
         class_id: user.class_id || '',
         profile_image: user.profile_image || '',
         created_at: user.created_at || ''
       };
       
       students.push(studentData);
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   students: students
 };
}

/**
* ฟังก์ชันดึงข้อมูลการมอบหมายวิชาทั้งหมด
*/
function getAssignments(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
 var assignmentsData = assignmentsSheet.getDataRange().getValues();
 
 var assignments = [];
 
 for (var i = 1; i < assignmentsData.length; i++) {
   try {
     var assignment = JSON.parse(assignmentsData[i][0]);
     assignments.push(assignment);
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   assignments: assignments
 };
}

/**
* ฟังก์ชันลบการมอบหมายวิชา
*/
function deleteAssignment(sessionId, assignmentId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
 var assignmentsData = assignmentsSheet.getDataRange().getValues();
 
 for (var i = 1; i < assignmentsData.length; i++) {
   try {
     var assignment = JSON.parse(assignmentsData[i][0]);
     if (assignment.assignment_id === assignmentId) {
       // ลบแถวข้อมูล
       assignmentsSheet.deleteRow(i + 1);
       
       return {
         status: 'success',
         message: 'ลบการมอบหมายเรียบร้อยแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลการมอบหมาย'
 };
}

/**
* ฟังก์ชันดึงข้อมูลนักเรียนสำหรับครู
*/
function getSubjectGrades(sessionId, subjectId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'teacher') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบว่าครูสอนวิชานี้หรือไม่
 var hasPermission = false;
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
 var assignmentsData = assignmentsSheet.getDataRange().getValues();
 
 for (var i = 1; i < assignmentsData.length; i++) {
   try {
     var assignment = JSON.parse(assignmentsData[i][0]);
     if (assignment.teacher_id === session.user.user_id && assignment.subject_id === subjectId) {
       hasPermission = true;
       break;
     }
   } catch (e) {
     continue;
   }
 }
 
 if (!hasPermission) {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึงรายวิชานี้'
   };
 }
 
 var gradesSheet = ss.getSheetByName('Grades');
 var gradesData = gradesSheet.getDataRange().getValues();
 
 var grades = [];
 
 for (var i = 1; i < gradesData.length; i++) {
   try {
     var grade = JSON.parse(gradesData[i][0]);
     if (grade.subject_id === subjectId) {
       grades.push(grade);
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'success',
   grades: grades
 };
}

/**
* ฟังก์ชันดึงข้อมูลส่วนตัวของนักเรียน (ปรับปรุงให้ส่งข้อมูลครบ)
*/
function getStudentInfo(sessionId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'student') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.user_id === session.user.user_id) {
       // ส่งข้อมูลครบทุกฟิลด์ (ไม่ส่งรหัสผ่าน)
       var studentInfo = {
         user_id: user.user_id,
         student_id: user.student_id || '',
         id_card: user.id_card || '',
         name: user.name || '',
         father_name: user.father_name || '',
         mother_name: user.mother_name || '',
         guardian_name: user.guardian_name || '',
         phone: user.phone || '',
         address: user.address || '',
         birth_date: user.birth_date || '',
         class_id: user.class_id || '',
         profile_image: user.profile_image || '',
         created_at: user.created_at || '',
         last_login: user.last_login || null
       };
       
       return {
         status: 'success',
         student: studentInfo
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลนักเรียน'
 };
}

/**
* ฟังก์ชันดึงข้อมูลนักเรียนตาม ID (ปรับปรุงให้ส่งข้อมูลครบ)
*/
function getStudentById(sessionId, studentId) {
  var session = checkSession(sessionId);
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  for (var i = 1; i < usersData.length; i++) {
    try {
      var user = JSON.parse(usersData[i][0]);
      if (user.user_id === studentId && user.role === 'student') {
        // สร้างออบเจกต์ใหม่เพื่อส่งข้อมูลกลับเฉพาะที่ต้องการ (รวมข้อมูลใหม่)
        var studentData = {
          user_id: user.user_id,
          student_id: user.student_id || '',
          id_card: user.id_card || '',
          name: user.name || '',
          father_name: user.father_name || '',           // เพิ่มข้อมูลใหม่
          mother_name: user.mother_name || '',           // เพิ่มข้อมูลใหม่
          guardian_name: user.guardian_name || '',       // เพิ่มข้อมูลใหม่
          phone: user.phone || '',                       // เพิ่มข้อมูลใหม่
          address: user.address || '',                   // เพิ่มข้อมูลใหม่
          birth_date: user.birth_date || '',             // เพิ่มข้อมูลใหม่
          class_id: user.class_id || '',
          profile_image: user.profile_image || ''        // เพิ่มข้อมูลรูปภาพ
        };
        
        // ลอง log ข้อมูลที่จะส่งกลับ
        console.log('Student data to return:', studentData);
        
        return {
          status: 'success',
          student: studentData
        };
      }
    } catch (e) {
      console.log('Error parsing user data:', e);
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลนักเรียน'
  };
}
/**
* ฟังก์ชันลบนักเรียน
*/
function deleteStudent(sessionId, studentId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.user_id === studentId && user.role === 'student') {
       // ลบข้อมูลนักเรียน
       usersSheet.deleteRow(i + 1);
       
       // ลบข้อมูลเกรดของนักเรียน
       var gradesSheet = ss.getSheetByName('Grades');
       var gradesData = gradesSheet.getDataRange().getValues();
       
       for (var j = gradesData.length - 1; j >= 1; j--) {
         try {
           var grade = JSON.parse(gradesData[j][0]);
           if (grade.student_id === studentId) {
             gradesSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       return {
         status: 'success',
         message: 'ลบนักเรียนเรียบร้อยแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลนักเรียน'
 };
}

/**
* ฟังก์ชันดึงข้อมูลระดับชั้นตาม ID
*/
function getClassById(sessionId, classId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var classesSheet = ss.getSheetByName('Classes');
 var classesData = classesSheet.getDataRange().getValues();
 
 for (var i = 1; i < classesData.length; i++) {
   try {
     var classObj = JSON.parse(classesData[i][0]);
     if (classObj.class_id === classId) {
       return {
         status: 'success',
         class: classObj
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลระดับชั้น'
 };
}

/**
* ฟังก์ชันลบระดับชั้น
*/
function deleteClass(sessionId, classId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var classesSheet = ss.getSheetByName('Classes');
 var classesData = classesSheet.getDataRange().getValues();
 
 for (var i = 1; i < classesData.length; i++) {
   try {
     var classObj = JSON.parse(classesData[i][0]);
     if (classObj.class_id === classId) {
       // ลบข้อมูลระดับชั้น
       classesSheet.deleteRow(i + 1);
       
       // ลบข้อมูลนักเรียนในระดับชั้น
       var usersSheet = ss.getSheetByName('Users');
       var usersData = usersSheet.getDataRange().getValues();
       
       for (var j = usersData.length - 1; j >= 1; j--) {
         try {
           var user = JSON.parse(usersData[j][0]);
           if (user.class_id === classId) {
             usersSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       // ลบข้อมูลการมอบหมายวิชาในระดับชั้น
       var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
       var assignmentsData = assignmentsSheet.getDataRange().getValues();
       
       for (var j = assignmentsData.length - 1; j >= 1; j--) {
         try {
           var assignment = JSON.parse(assignmentsData[j][0]);
           if (assignment.class_id === classId) {
             assignmentsSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       return {
         status: 'success',
         message: 'ลบระดับชั้นเรียบร้อยแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลระดับชั้น'
 };
}

/**
* ฟังก์ชันดึงข้อมูลรายวิชาตาม ID
*/
function getSubjectById(sessionId, subjectId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var subjectsSheet = ss.getSheetByName('Subjects');
 var subjectsData = subjectsSheet.getDataRange().getValues();
 
 for (var i = 1; i < subjectsData.length; i++) {
   try {
     var subject = JSON.parse(subjectsData[i][0]);
     if (subject.subject_id === subjectId) {
       return {
         status: 'success',
         subject: subject
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลรายวิชา'
 };
}

/**
* ฟังก์ชันลบรายวิชา
*/
function deleteSubject(sessionId, subjectId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var subjectsSheet = ss.getSheetByName('Subjects');
 var subjectsData = subjectsSheet.getDataRange().getValues();
 
 for (var i = 1; i < subjectsData.length; i++) {
   try {
     var subject = JSON.parse(subjectsData[i][0]);
     if (subject.subject_id === subjectId) {
       // ลบข้อมูลรายวิชา
       subjectsSheet.deleteRow(i + 1);
       
       // ลบข้อมูลการมอบหมายวิชา
       var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
       var assignmentsData = assignmentsSheet.getDataRange().getValues();
       
       for (var j = assignmentsData.length - 1; j >= 1; j--) {
         try {
           var assignment = JSON.parse(assignmentsData[j][0]);
           if (assignment.subject_id === subjectId) {
             assignmentsSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       // ลบข้อมูลเกรดของรายวิชา
       var gradesSheet = ss.getSheetByName('Grades');
       var gradesData = gradesSheet.getDataRange().getValues();
       
       for (var j = gradesData.length - 1; j >= 1; j--) {
         try {
           var grade = JSON.parse(gradesData[j][0]);
           if (grade.subject_id === subjectId) {
             gradesSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       return {
         status: 'success',
         message: 'ลบรายวิชาเรียบร้อยแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลรายวิชา'
 };
}

/**
* ฟังก์ชันดึงข้อมูลครูผู้สอนตาม ID
*/
function getTeacherById(sessionId, teacherId) {
 var session = checkSession(sessionId);
 if (session.status === 'error') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.user_id === teacherId && user.role === 'teacher') {
       // ไม่ส่งข้อมูลรหัสผ่านกลับไป
       delete user.password;
       delete user.session_id;
       
       return {
         status: 'success',
         teacher: user
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลครูผู้สอน'
 };
}

/**
* ฟังก์ชันลบครูผู้สอน
*/
function deleteTeacher(sessionId, teacherId) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var usersSheet = ss.getSheetByName('Users');
 var usersData = usersSheet.getDataRange().getValues();
 
 for (var i = 1; i < usersData.length; i++) {
   try {
     var user = JSON.parse(usersData[i][0]);
     if (user.user_id === teacherId && user.role === 'teacher') {
       // ลบข้อมูลครูผู้สอน
       usersSheet.deleteRow(i + 1);
       
       // ลบข้อมูลการมอบหมายวิชา
       var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
       var assignmentsData = assignmentsSheet.getDataRange().getValues();
       
       for (var j = assignmentsData.length - 1; j >= 1; j--) {
         try {
           var assignment = JSON.parse(assignmentsData[j][0]);
           if (assignment.teacher_id === teacherId) {
             assignmentsSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       // ลบคำขอรีเซ็ตรหัสผ่าน
       var resetsSheet = ss.getSheetByName('PasswordResets');
       var resetsData = resetsSheet.getDataRange().getValues();
       
       for (var j = resetsData.length - 1; j >= 1; j--) {
         try {
           var reset = JSON.parse(resetsData[j][0]);
           if (reset.user_id === teacherId) {
             resetsSheet.deleteRow(j + 1);
           }
         } catch (e) {
           continue;
         }
       }
       
       return {
         status: 'success',
         message: 'ลบครูผู้สอนเรียบร้อยแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลครูผู้สอน'
 };
}

/**
* ฟังก์ชันอัปเดตข้อมูลนักเรียน (ปรับปรุง)
*/
function updateStudent(sessionId, studentId, studentData) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบข้อมูลที่จำเป็น
 if (!studentData.student_id || !studentData.name || !studentData.class_id) {
   return {
     status: 'error',
     message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var sheet = ss.getSheetByName('Users');
 var data = sheet.getDataRange().getValues();
 
 // ตรวจสอบว่ารหัสนักเรียนซ้ำหรือไม่ (ยกเว้นตัวเอง)
 for (var i = 1; i < data.length; i++) {
   try {
     var user = JSON.parse(data[i][0]);
     if (user.user_id !== studentId) {
       if (user.student_id === studentData.student_id) {
         return {
           status: 'error',
           message: 'รหัสนักเรียนนี้มีอยู่ในระบบแล้ว'
         };
       }
       if (studentData.id_card && user.id_card === studentData.id_card) {
         return {
           status: 'error',
           message: 'เลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว'
         };
       }
     }
   } catch (e) {
     continue;
   }
 }
 
 // อัปเดตข้อมูลนักเรียน
 for (var i = 1; i < data.length; i++) {
   try {
     var user = JSON.parse(data[i][0]);
     if (user.user_id === studentId) {
       // อัปเดตข้อมูล
       user.student_id = studentData.student_id;
       user.id_card = studentData.id_card || '';
       user.name = studentData.name;
       user.father_name = studentData.father_name || '';
       user.mother_name = studentData.mother_name || '';
       user.guardian_name = studentData.guardian_name || '';
       user.phone = studentData.phone || '';
       user.address = studentData.address || '';
       user.birth_date = studentData.birth_date || '';
       user.class_id = studentData.class_id;
       if (studentData.profile_image) {
         user.profile_image = studentData.profile_image;
       }
       user.updated_at = new Date().toISOString();
       user.updated_by = session.user.user_id;
       
       // บันทึกข้อมูล
       sheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
       
       return {
         status: 'success',
         message: 'อัปเดตข้อมูลนักเรียนสำเร็จ'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลนักเรียน'
 };
}

/**
* ฟังก์ชันอัปเดตข้อมูลระดับชั้น
*/
function updateClass(sessionId, classId, className) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบข้อมูลที่จำเป็น
 if (!className) {
   return {
     status: 'error',
     message: 'กรุณากรอกชื่อระดับชั้น'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var sheet = ss.getSheetByName('Classes');
 var data = sheet.getDataRange().getValues();
 
 // อัปเดตข้อมูลระดับชั้น
 for (var i = 1; i < data.length; i++) {
   try {
     var classObj = JSON.parse(data[i][0]);
     if (classObj.class_id === classId) {
       // อัปเดตข้อมูล
       classObj.name = className;
       classObj.updated_at = new Date().toISOString();
       classObj.updated_by = session.user.user_id;
       
       // บันทึกข้อมูล
       sheet.getRange(i + 1, 1).setValue(JSON.stringify(classObj));
       
       return {
         status: 'success',
         message: 'อัปเดตข้อมูลระดับชั้นสำเร็จ'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลระดับชั้น'
 };
}

/**
* ฟังก์ชันอัปเดตข้อมูลรายวิชา
*/
function updateSubject(sessionId, subjectId, subjectData) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบข้อมูลที่จำเป็น
 if (!subjectData.code || !subjectData.name || !subjectData.type || !subjectData.credit) {
   return {
     status: 'error',
     message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var sheet = ss.getSheetByName('Subjects');
 var data = sheet.getDataRange().getValues();
 
 // ตรวจสอบว่ารหัสวิชาซ้ำหรือไม่ (ยกเว้นตัวเอง)
 for (var i = 1; i < data.length; i++) {
   try {
     var subject = JSON.parse(data[i][0]);
     if (subject.subject_id !== subjectId && subject.code === subjectData.code) {
       return {
         status: 'error',
         message: 'รหัสวิชานี้มีอยู่ในระบบแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 // อัปเดตข้อมูลรายวิชา
 for (var i = 1; i < data.length; i++) {
   try {
     var subject = JSON.parse(data[i][0]);
     if (subject.subject_id === subjectId) {
       // อัปเดตข้อมูล
       subject.code = subjectData.code;
       subject.name = subjectData.name;
       subject.type = subjectData.type;
       subject.credit = subjectData.credit;
       subject.updated_at = new Date().toISOString();
       subject.updated_by = session.user.user_id;
       
       // บันทึกข้อมูล
       sheet.getRange(i + 1, 1).setValue(JSON.stringify(subject));
       
       return {
         status: 'success',
         message: 'อัปเดตข้อมูลรายวิชาสำเร็จ'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลรายวิชา'
 };
}

/**
* ฟังก์ชันอัปเดตข้อมูลครูผู้สอน
*/
function updateTeacher(sessionId, teacherId, teacherData) {
 var session = checkSession(sessionId);
 if (session.status === 'error' || session.user.role !== 'admin') {
   return {
     status: 'error',
     message: 'ไม่มีสิทธิ์เข้าถึง'
   };
 }
 
 // ตรวจสอบข้อมูลที่จำเป็น
 if (!teacherData.username || !teacherData.name || !teacherData.email) {
   return {
     status: 'error',
     message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
   };
 }
 
 var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 var sheet = ss.getSheetByName('Users');
 var data = sheet.getDataRange().getValues();
 
 // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่ (ยกเว้นตัวเอง)
 for (var i = 1; i < data.length; i++) {
   try {
     var user = JSON.parse(data[i][0]);
     if (user.user_id !== teacherId && user.username === teacherData.username) {
       return {
         status: 'error',
         message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 // อัปเดตข้อมูลครูผู้สอน
 for (var i = 1; i < data.length; i++) {
   try {
     var user = JSON.parse(data[i][0]);
     if (user.user_id === teacherId) {
       // อัปเดตข้อมูล
       user.username = teacherData.username;
       user.name = teacherData.name;
       user.email = teacherData.email;
       user.updated_at = new Date().toISOString();
       user.updated_by = session.user.user_id;
       
       // บันทึกข้อมูล
       sheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
       
       return {
         status: 'success',
         message: 'อัปเดตข้อมูลครูผู้สอนสำเร็จ'
       };
     }
   } catch (e) {
     continue;
   }
 }
 
 return {
   status: 'error',
   message: 'ไม่พบข้อมูลครูผู้สอน'
 };
}

/**
* ฟังก์ชันอัปเดตการมอบหมายวิชา
*/
function updateAssignment(sessionId, assignmentId, teacherId, classId, subjectId) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'admin') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
  var assignmentsData = assignmentsSheet.getDataRange().getValues();
  
  for (var i = 1; i < assignmentsData.length; i++) {
    try {
      var assignment = JSON.parse(assignmentsData[i][0]);
      if (assignment.assignment_id === assignmentId) {
        // อัปเดตข้อมูล
        assignment.teacher_id = teacherId;
        assignment.class_id = classId;
        assignment.subject_id = subjectId;
        assignment.updated_at = new Date().toISOString();
        assignment.updated_by = session.user.user_id;
        
        // บันทึกข้อมูล
        assignmentsSheet.getRange(i + 1, 1).setValue(JSON.stringify(assignment));
        
        return {
          status: 'success',
          message: 'อัปเดตการมอบหมายวิชาสำเร็จ'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลการมอบหมาย'
  };
}

/**
* ฟังก์ชันดึงข้อมูลการมอบหมายวิชาตาม ID
*/
function getAssignmentById(sessionId, assignmentId) {
  var session = checkSession(sessionId);
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
  var assignmentsData = assignmentsSheet.getDataRange().getValues();
  
  for (var i = 1; i < assignmentsData.length; i++) {
    try {
      var assignment = JSON.parse(assignmentsData[i][0]);
      if (assignment.assignment_id === assignmentId) {
        return {
          status: 'success',
          assignment: assignment
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลการมอบหมาย'
  };
}

/**
 * ฟังก์ชันดึงเกณฑ์การตัดเกรด (ตรวจสอบการ return ข้อมูล)
 */
function getGradingCriteria(sessionId, subjectId) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  // ตรวจสอบว่าเป็นครูผู้สอนวิชานี้หรือไม่
  if (session.user.role === 'teacher') {
    var hasPermission = false;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
    var assignmentsData = assignmentsSheet.getDataRange().getValues();
    
    for (var i = 1; i < assignmentsData.length; i++) {
      try {
        var assignment = JSON.parse(assignmentsData[i][0]);
        if (assignment.teacher_id === session.user.user_id && assignment.subject_id === subjectId) {
          hasPermission = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!hasPermission) {
      return {
        status: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงรายวิชานี้'
      };
    }
  }
  
  // ดึงเกณฑ์การตัดเกรด
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var criteriaSheet = ss.getSheetByName('GradingCriteria');
  
  // ถ้ายังไม่มี sheet GradingCriteria ให้สร้างใหม่
  if (!criteriaSheet) {
    criteriaSheet = ss.insertSheet('GradingCriteria');
    criteriaSheet.appendRow(['criteria_json']);
  }
  
  var criteriaData = criteriaSheet.getDataRange().getValues();
  
  // หาเกณฑ์ของรายวิชา
  for (var i = 1; i < criteriaData.length; i++) {
    try {
      var criteria = JSON.parse(criteriaData[i][0]);
      if (criteria.subject_id === subjectId) {
        // ตรวจสอบและส่งคืนข้อมูลให้ถูกต้อง
        return {
          status: 'success',
          criteria: criteria.grading_criteria || {
            '4': 80,
            '3.5': 75,
            '3': 70,
            '2.5': 65,
            '2': 60,
            '1.5': 55,
            '1': 50,
            '0': 0
          }
        };
      }
    } catch (e) {
      console.log('Error parsing criteria:', e);
      continue;
    }
  }
  
  // ถ้าไม่พบเกณฑ์สำหรับรายวิชานี้ ให้ใช้เกณฑ์มาตรฐาน
  return {
    status: 'success',
    criteria: {
      '4': 80,
      '3.5': 75,
      '3': 70,
      '2.5': 65,
      '2': 60,
      '1.5': 55,
      '1': 50,
      '0': 0
    }
  };
}

/**
 * ฟังก์ชันตั้งค่าเกณฑ์การตัดเกรด
 */
function setGradingCriteria(sessionId, subjectId, criteriaData) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  // ตรวจสอบว่าเป็นครูผู้สอนวิชานี้หรือไม่
  if (session.user.role === 'teacher') {
    var hasPermission = false;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var assignmentsSheet = ss.getSheetByName('TeacherAssignments');
    var assignmentsData = assignmentsSheet.getDataRange().getValues();
    
    for (var i = 1; i < assignmentsData.length; i++) {
      try {
        var assignment = JSON.parse(assignmentsData[i][0]);
        if (assignment.teacher_id === session.user.user_id && assignment.subject_id === subjectId) {
          hasPermission = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!hasPermission) {
      return {
        status: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงรายวิชานี้'
      };
    }
  }
  
  // บันทึกเกณฑ์การตัดเกรด
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var criteriaSheet = ss.getSheetByName('GradingCriteria');
  
  // ถ้ายังไม่มี sheet GradingCriteria ให้สร้างใหม่
  if (!criteriaSheet) {
    criteriaSheet = ss.insertSheet('GradingCriteria');
    criteriaSheet.appendRow(['criteria_json']);
  }
  
  var criteriaData = criteriaSheet.getDataRange().getValues();
  
  // ตรวจสอบว่ามีเกณฑ์ของรายวิชานี้อยู่แล้วหรือไม่
  var isExisting = false;
  for (var i = 1; i < criteriaData.length; i++) {
    try {
      var criteria = JSON.parse(criteriaData[i][0]);
      if (criteria.subject_id === subjectId) {
        // อัปเดตเกณฑ์
        criteria.grading_criteria = criteriaData;
        criteria.updated_at = new Date().toISOString();
        criteria.updated_by = session.user.user_id;
        
        criteriaSheet.getRange(i + 1, 1).setValue(JSON.stringify(criteria));
        isExisting = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  // ถ้ายังไม่มีเกณฑ์ ให้สร้างใหม่
  if (!isExisting) {
    var newCriteria = {
      criteria_id: Utilities.getUuid(),
      subject_id: subjectId,
      grading_criteria: criteriaData,
      created_at: new Date().toISOString(),
      created_by: session.user.user_id,
      updated_at: new Date().toISOString(),
      updated_by: session.user.user_id
    };
    
    criteriaSheet.appendRow([JSON.stringify(newCriteria)]);
  }
  
  return {
    status: 'success',
    message: 'บันทึกเกณฑ์การตัดเกรดเรียบร้อยแล้ว'
  };
}

/**
 * ฟังก์ชันดึงข้อมูลส่วนตัวของครูผู้สอน
 */
function getTeacherProfile(sessionId) {
  var session = checkSession(sessionId);
  if (session.status === 'error' || session.user.role !== 'teacher') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  for (var i = 1; i < usersData.length; i++) {
    try {
      var user = JSON.parse(usersData[i][0]);
      if (user.user_id === session.user.user_id) {
        // ไม่ส่งข้อมูลรหัสผ่านกลับไป
        delete user.password;
        delete user.session_id;
        
        return {
          status: 'success',
          teacher: user
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลครูผู้สอน'
  };
}

/**
 * ฟังก์ชันเปลี่ยนรหัสผ่าน
 */
function changePassword(sessionId, currentPassword, newPassword) {
  var session = checkSession(sessionId);
  if (session.status === 'error') {
    return {
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    };
  }
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  for (var i = 1; i < usersData.length; i++) {
    try {
      var user = JSON.parse(usersData[i][0]);
      if (user.user_id === session.user.user_id) {
        // ตรวจสอบรหัสผ่านปัจจุบัน
        if (user.password !== hashPassword(currentPassword)) {
          return {
            status: 'error',
            message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
          };
        }
        
        // เปลี่ยนรหัสผ่าน
        user.password = hashPassword(newPassword);
        user.updated_at = new Date().toISOString();
        
        // บันทึกข้อมูล
        usersSheet.getRange(i + 1, 1).setValue(JSON.stringify(user));
        
        return {
          status: 'success',
          message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return {
    status: 'error',
    message: 'ไม่พบข้อมูลผู้ใช้'
  };
}