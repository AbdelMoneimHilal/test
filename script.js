import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCoKXd-RLGwtBQ2Exbk3cxXrzWGXpz40P0",
    authDomain: "school-exams-e9474.firebaseapp.com",
    projectId: "school-exams-e9474",
    storageBucket: "school-exams-e9474.firebasestorage.app",
    messagingSenderId: "86794889937",
    appId: "1:86794889937:web:267fb9d7339968ba2673f0",
    measurementId: "G-0FTLXQV2G9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let questionBank = [];
let currentStudent = null;
let activeQuestions = [];
let timerInterval = null;
let cachedResults = [];

// إخفاء رسالة التحميل فور اكتمال التشغيل
document.getElementById("error-msg").innerText = "";

// اختيار الصف
document.getElementById("selected-grade").addEventListener("change", function() {
    const grade = this.value;
    document.getElementById("grade-options").style.display = grade ? "block" : "none";
});

// إضافة سؤال
document.getElementById("add-q-btn").addEventListener("click", async function() {
    const grade = document.getElementById("selected-grade").value;
    const qText = document.getElementById("new-q-text").value.trim();
    const opt0 = document.getElementById("new-opt-0").value.trim();
    const opt1 = document.getElementById("new-opt-1").value.trim();
    const opt2 = document.getElementById("new-opt-2").value.trim();
    const opt3 = document.getElementById("new-opt-3").value.trim();
    const correct = parseInt(document.getElementById("new-correct").value);
    const status = document.getElementById("q-status");

    if (!qText || !opt0 || !opt1) {
        alert("الرجاء تعبئة نص السؤال والخيارين الأول والثاني على الأقل.");
        return;
    }

    const questionObj = {
        q: qText,
        options: [opt0, opt1, opt2, opt3].filter(o => o !== ""),
        correct: correct,
        grade: grade
    };

    try {
        const docId = grade + "_q_" + Date.now();
        await setDoc(doc(db, "questions", docId), questionObj);
        status.innerText = "تمت إضافة السؤال بنجاح!";
        document.getElementById("new-q-text").value = "";
        document.getElementById("new-opt-0").value = "";
        document.getElementById("new-opt-1").value = "";
        document.getElementById("new-opt-2").value = "";
        document.getElementById("new-opt-3").value = "";
    } catch (err) {
        console.error(err);
        status.innerText = "حدث خطأ أثناء الحفظ.";
    }
});

// إضافة طالب
document.getElementById("add-s-btn").addEventListener("click", async function() {
    const grade = document.getElementById("selected-grade").value;
    const sId = document.getElementById("new-student-id").value.trim();
    const sName = document.getElementById("new-student-name").value.trim();
    const sSection = document.getElementById("new-student-section").value.trim();
    const status = document.getElementById("s-status");

    if (!sId || !sName) {
        alert("الرجاء إدخال الرقم الامتحاني واسم الطالب.");
        return;
    }

    try {
        await setDoc(doc(db, "students", sId), {
            name: sName,
            grade: grade,
            section: sSection || "عامة"
        });
        status.innerText = "تم تسجيل الطالب بنجاح!";
        document.getElementById("new-student-id").value = "";
        document.getElementById("new-student-name").value = "";
        document.getElementById("new-student-section").value = "";
    } catch (err) {
        console.error(err);
        status.innerText = "حدث خطأ أثناء تسجيل الطالب.";
    }
});

// جلب النتائج
async function loadExamResults() {
    const tbody = document.getElementById("results-body");
    tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>جاري جلب النتائج...</td></tr>";
    try {
        const querySnapshot = await getDocs(collection(db, "exam_results"));
        cachedResults = [];
        querySnapshot.forEach((doc) => {
            cachedResults.push(doc.data());
        });

        if (cachedResults.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>لا توجد نتائج مسجلة حتى الآن.</td></tr>";
            return;
        }

        tbody.innerHTML = "";
        cachedResults.forEach((res) => {
            tbody.innerHTML += `
                <tr>
                    <td>${res.examId}</td>
                    <td>${res.studentName}</td>
                    <td><b>${res.score}</b> / 100</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: red;'>خطأ في جلب النتائج.</td></tr>";
    }
}
document.getElementById("refresh-results-btn").addEventListener("click", loadExamResults);

// تصدير PDF
document.getElementById("download-pdf-btn").addEventListener("click", function() {
    if (cachedResults.length === 0) {
        alert("الرجاء النقر على 'تحديث وعرض النتائج' أولاً.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF();

    docPDF.setFont("Tahoma", "normal");
    docPDF.text("تقرير نتائج الامتحانات المدرسية", 105, 20, { align: "center" });
    docPDF.text("الأستاذ: عبدالمنعم حسن هلال", 105, 28, { align: "center" });

    let y = 45;
    docPDF.setFontSize(12);
    docPDF.text("الرقم", 30, y);
    docPDF.text("اسم الطالب", 80, y);
    docPDF.text("العلامة", 160, y);
    docPDF.line(20, y + 3, 190, y + 3);

    y += 10;
    cachedResults.forEach((res) => {
        docPDF.text(String(res.examId), 30, y);
        docPDF.text(String(res.studentName), 80, y);
        docPDF.text(String(res.score) + " / 100", 160, y);
        y += 8;
    });

    docPDF.save("Exam_Results.pdf");
});

// تسجيل الدخول
document.getElementById("login-btn").addEventListener("click", async function() {
    const inputId = document.getElementById("examIdInput").value.trim();
    const errorMsg = document.getElementById("error-msg");
    
    if (inputId === "0000") {
        currentStudent = { id: "0000", name: "الأستاذ عبدالمنعم حسن هلال" };
        document.getElementById("teacher-dashboard").style.display = "block";
        errorMsg.innerText = "أهلاً بك يا استاذ في لوحة التحكم الإدارية.";
        loadExamResults();
        return;
    } else {
        try {
            const studentDoc = await getDoc(doc(db, "students", inputId));
            if (studentDoc.exists()) {
                currentStudent = { id: inputId, ...studentDoc.data() };
            } else {
                errorMsg.innerText = "الرقم الامتحاني غير مسجل في قاعدة البيانات.";
                return;
            }
        } catch (error) {
            errorMsg.innerText = "حدث خطأ أثناء التحقق.";
            return;
        }
    }

    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        questionBank = [];
        querySnapshot.forEach((d) => {
            const data = d.data();
            if (!data.grade || data.grade === currentStudent.grade) {
                questionBank.push(data);
            }
        });
    } catch (err) {
        console.error(err);
    }

    if (questionBank.length === 0) {
        errorMsg.innerText = "لا توجد أسئلة مسجلة لهذا الصف حتى الآن!";
        return;
    }

    activeQuestions = getRandomQuestions(questionBank, Math.min(5, questionBank.length));
    renderQuestions();

    document.getElementById("login-container").style.display = "none";
    document.getElementById("exam-container").style.display = "block";
    document.getElementById("student-welcome").innerText = "أهلاً بك، " + currentStudent.name;
    document.getElementById("exam-title-grade").innerText = "اختبار مادة الرياضيات - الشعبة: " + (currentStudent.section || "عامة");
    
    startTimer(5 * 60);
});

function startTimer(duration) {
    let timer = duration, minutes, seconds;
    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        document.getElementById("time-left").textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            alert("انتهى وقت الامتحان!");
            submitExam();
        }
    }, 1000);
}

function getRandomQuestions(arr, count) {
    let shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function renderQuestions() {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";
    activeQuestions.forEach((item, index) => {
        let optionsHtml = "";
        let shuffledOptions = item.options.map((opt, idx) => ({ text: opt, originalIndex: idx }))
                                         .sort(() => 0.5 - Math.random());
        
        shuffledOptions.forEach((optObj) => {
            optionsHtml += `<label><input type="radio" name="q_${index}" value="${optObj.originalIndex}"> ${optObj.text}</label>`;
        });

        container.innerHTML += `
            <div class="question-box">
                <p>${index + 1}. ${item.q}</p>
                <div class="options">${optionsHtml}</div>
            </div>
        `;
    });
}

async function submitExam() {
    if (timerInterval) clearInterval(timerInterval);
    let score = 0;
    const pointsPerQuestion = Math.floor(100 / activeQuestions.length);

    activeQuestions.forEach((item, index) => {
        const selected = document.querySelector(`input[name="q_${index}"]:checked`);
        if (selected && parseInt(selected.value) === item.correct) {
            score += pointsPerQuestion;
        }
    });

    document.getElementById("questions-container").style.display = "none";
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("timer-box").style.display = "none";
    document.getElementById("result-box").style.display = "block";
    document.getElementById("score-text").innerText = `علامتك النهائية هي: ${score} من 100`;

    try {
        const docId = currentStudent.id === "0000" ? "teacher_" + Date.now() : currentStudent.id;
        await setDoc(doc(db, "exam_results", docId), {
            examId: currentStudent.id,
            studentName: currentStudent.name,
            grade: currentStudent.grade || "غير محدد",
            section: currentStudent.section || "عامة",
            score: score,
            submitTime: new Date().toISOString()
        });
    } catch (error) {
        console.error("خطأ في حفظ النتيجة:", error);
    }
}
document.getElementById("submit-btn").addEventListener("click", submitExam);