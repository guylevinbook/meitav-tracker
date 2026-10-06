import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "./lib/supabase";
import "./App.css";

const successMessages = [
  "גאה בך יפה שלי ❤️",
  "עוד יום שעשית משהו טוב בשביל עצמך",
  "ידעתי שתעמדי בזה 🫶",
  "את עושה את זה מדהים",
  "עוד צעד קטן בדרך למטרה שלך 💪",
];

const supportMessages = [
  "יום אחד לא משנה את הדרך שלך 🤍",
  "מחר יום חדש, ואני איתך",
  "לא צריך להיות מושלמת כדי להתקדם",
  "גם ימים כאלה הם חלק מהתהליך",
  "גאה בך גם על זה שאת ממשיכה לעקוב ❤️",
];

const milestones = [
  {
    days: 7,
    emoji: "🌿",
    title: "שבוע שלם!",
    message: "7 ימים ברצף. גאה בך ממש ❤️",
    level: "week",
  },
  {
    days: 14,
    emoji: "✨",
    title: "שבועיים!",
    message: "שבועיים ברצף. ידעתי שאת יכולה ❤️",
    level: "twoWeeks",
  },
  {
    days: 30,
    emoji: "🏆",
    title: "חודש שלם!",
    message: "30 ימים ברצף. זה כבר לא רק להתחיל — זה באמת להתמיד.",
    level: "monthMilestone",
  },
  {
    days: 60,
    emoji: "💎",
    title: "חודשיים!",
    message: "60 ימים. תעצרי שנייה ותביני כמה רחוק כבר הגעת.",
    level: "twoMonths",
  },
  {
    days: 90,
    emoji: "👑",
    title: "90 ימים!",
    message: "90 ימים ברצף. את פסיכית, ואני גאה בך ברמות ❤️",
    level: "legendMilestone",
  },
];

const monthNames = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const weekDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function rowsToData(rows = []) {
  const result = {};

  rows.forEach((row) => {
    result[row.entry_date] = {
      answer: row.answer,
      message: row.message || "",
    };
  });

  return result;
}

function getMonthStats(data, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let yesCount = 0;
  let noCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = getDateKey(new Date(year, month, day));
    const answer = data[key]?.answer;

    if (answer === "yes") yesCount++;
    if (answer === "no") noCount++;
  }

  const answeredCount = yesCount + noCount;

  const successRate =
    answeredCount === 0
      ? 0
      : Math.round((yesCount / answeredCount) * 100);

  return {
    yesCount,
    noCount,
    answeredCount,
    successRate,
  };
}

function calculateCurrentStreak(data) {
  let count = 0;

  const today = new Date();
  const todayKey = getDateKey(today);
  const todayAnswer = data[todayKey]?.answer;

  const date = new Date(today);

  if (!todayAnswer) {
    date.setDate(date.getDate() - 1);
  }

  while (true) {
    const key = getDateKey(date);

    if (data[key]?.answer === "yes") {
      count++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

function calculateBestStreak(data) {
  const yesDates = Object.keys(data)
    .filter((key) => data[key]?.answer === "yes")
    .sort();

  if (yesDates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < yesDates.length; i++) {
    const previous = new Date(`${yesDates[i - 1]}T12:00:00`);
    const currentDate = new Date(`${yesDates[i]}T12:00:00`);

    const difference = Math.round(
      (currentDate - previous) / 86400000
    );

    if (difference === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function getCurrentStreakStart(data) {
  const today = new Date();
  const todayKey = getDateKey(today);

  if (data[todayKey]?.answer !== "yes") {
    return null;
  }

  const date = new Date(today);

  while (true) {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);

    const previousKey = getDateKey(previous);

    if (data[previousKey]?.answer === "yes") {
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  return getDateKey(date);
}

function isFutureDate(date) {
  const compareDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const today = new Date();

  const compareToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return compareDate > compareToday;
}

function App() {
  const [screen, setScreen] = useState("today");
  const [progressView, setProgressView] = useState("month");

  const [answer, setAnswer] = useState(null);
  const [message, setMessage] = useState("");

  const [data, setData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [celebration, setCelebration] = useState(null);
  const [editingDate, setEditingDate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    setSyncError("");

    const { data: rows, error } = await supabase
      .from("daily_entries")
      .select("entry_date, answer, message")
      .order("entry_date", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setSyncError("לא הצלחתי לטעון את הנתונים");
      setLoading(false);
      return;
    }

    const loadedData = rowsToData(rows);

    setData(loadedData);

    const todayKey = getDateKey();
    const todayEntry = loadedData[todayKey];

    if (todayEntry) {
      setAnswer(todayEntry.answer);
      setMessage(todayEntry.message);
    } else {
      setAnswer(null);
      setMessage("");
    }

    setLoading(false);
  }

  const launchCelebrationEffects = (milestone) => {
    setCelebration(milestone);

    setTimeout(() => {
      confetti({
        particleCount: milestone.days >= 30 ? 320 : 220,
        spread: milestone.days >= 30 ? 155 : 110,
        startVelocity: 46,
        origin: { y: 0.62 },
      });
    }, 180);

    setTimeout(() => {
      confetti({
        particleCount: milestone.days >= 60 ? 220 : 150,
        angle: 60,
        spread: 90,
        origin: { x: 0, y: 0.65 },
      });

      confetti({
        particleCount: milestone.days >= 60 ? 220 : 150,
        angle: 120,
        spread: 90,
        origin: { x: 1, y: 0.65 },
      });
    }, 650);

    if (milestone.days >= 30) {
      setTimeout(() => {
        confetti({
          particleCount: 180,
          spread: 170,
          startVelocity: 35,
          origin: { y: 0.25 },
        });
      }, 1150);
    }
  };

  const checkMilestone = async (newData) => {
    const newStreak = calculateCurrentStreak(newData);

    const milestone = milestones.find(
      (item) => item.days === newStreak
    );

    if (!milestone) return;

    const streakStart = getCurrentStreakStart(newData);

    if (!streakStart) return;

    const {
      data: existingCelebration,
      error: checkError,
    } = await supabase
      .from("milestone_celebrations")
      .select("id")
      .eq("streak_start", streakStart)
      .eq("milestone_days", milestone.days)
      .maybeSingle();

    if (checkError) {
      console.error(
        "Milestone check failed:",
        checkError
      );
      return;
    }

    if (existingCelebration) {
      return;
    }

    const { error: insertError } =
      await supabase
        .from("milestone_celebrations")
        .insert({
          streak_start: streakStart,
          milestone_days: milestone.days,
        });

    if (insertError) {
      console.error(
        "Milestone save failed:",
        insertError
      );
      return;
    }

    launchCelebrationEffects(milestone);
  };

  const updateLocalState = (newData) => {
    setData(newData);

    const todayKey = getDateKey();
    const todayEntry = newData[todayKey];

    if (todayEntry) {
      setAnswer(todayEntry.answer);
      setMessage(todayEntry.message || "");
    } else {
      setAnswer(null);
      setMessage("");
    }
  };

  const upsertEntry = async (
    entryDate,
    value,
    selectedMessage
  ) => {
    setSyncError("");

    const { error } = await supabase
      .from("daily_entries")
      .upsert(
        {
          entry_date: entryDate,
          answer: value,
          message: selectedMessage,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "entry_date",
        }
      );

    if (error) {
      console.error(error);
      setSyncError("השמירה נכשלה. נסי שוב.");
      return false;
    }

    return true;
  };

  const deleteEntry = async (entryDate) => {
    setSyncError("");

    const { error } = await supabase
      .from("daily_entries")
      .delete()
      .eq("entry_date", entryDate);

    if (error) {
      console.error(error);
      setSyncError("המחיקה נכשלה. נסי שוב.");
      return false;
    }

    return true;
  };

  const saveAnswer = async (
    value,
    selectedMessage
  ) => {
    const todayKey = getDateKey();

    const success = await upsertEntry(
      todayKey,
      value,
      selectedMessage
    );

    if (!success) return;

    const newData = {
      ...data,
      [todayKey]: {
        answer: value,
        message: selectedMessage,
      },
    };

    updateLocalState(newData);

    if (value === "yes") {
      await checkMilestone(newData);
    }
  };

  const handleYes = async () => {
    const selectedMessage =
      getRandomMessage(successMessages);

    await saveAnswer(
      "yes",
      selectedMessage
    );

    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.65 },
    });
  };

  const handleNo = async () => {
    const selectedMessage =
      getRandomMessage(supportMessages);

    await saveAnswer(
      "no",
      selectedMessage
    );
  };

  const resetToday = async () => {
    const todayKey = getDateKey();

    const success =
      await deleteEntry(todayKey);

    if (!success) return;

    const newData = {
      ...data,
    };

    delete newData[todayKey];

    updateLocalState(newData);
  };

  const updateCalendarDay = async (value) => {
    if (!editingDate) return;

    const key = getDateKey(editingDate);

    const newData = {
      ...data,
    };

    if (value === null) {
      const success =
        await deleteEntry(key);

      if (!success) return;

      delete newData[key];
    } else {
      const selectedMessage =
        value === "yes"
          ? getRandomMessage(successMessages)
          : getRandomMessage(supportMessages);

      const success =
        await upsertEntry(
          key,
          value,
          selectedMessage
        );

      if (!success) return;

      newData[key] = {
        answer: value,
        message: selectedMessage,
      };
    }

    updateLocalState(newData);
    setEditingDate(null);

    if (value === "yes") {
      await checkMilestone(newData);
    }
  };

  const monthInfo = useMemo(() => {
    const year =
      selectedMonth.getFullYear();

    const month =
      selectedMonth.getMonth();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date =
        new Date(
          year,
          month,
          day
        );

      const key =
        getDateKey(date);

      days.push({
        day,
        key,
        date,
        status:
          data[key]?.answer ||
          null,
        future:
          isFutureDate(date),
      });
    }

    const stats =
      getMonthStats(
        data,
        year,
        month
      );

    return {
      year,
      month,
      days,
      ...stats,
    };
  }, [selectedMonth, data]);

  const yearStats = useMemo(() => {
    const year =
      selectedMonth.getFullYear();

    return monthNames.map(
      (name, month) => ({
        name,
        month,
        ...getMonthStats(
          data,
          year,
          month
        ),
      })
    );
  }, [data, selectedMonth]);

  const streak = useMemo(
    () =>
      calculateCurrentStreak(data),
    [data]
  );

  const bestStreak = useMemo(
    () =>
      calculateBestStreak(data),
    [data]
  );

  const totalWins = useMemo(() => {
    return Object.values(data)
      .filter(
        (entry) =>
          entry?.answer === "yes"
      ).length;
  }, [data]);

  const unlockedMilestones =
    useMemo(() => {
      return milestones.filter(
        (milestone) =>
          bestStreak >= milestone.days
      );
    }, [bestStreak]);

  const nextMilestone =
    useMemo(() => {
      return milestones.find(
        (milestone) =>
          streak < milestone.days
      );
    }, [streak]);

  const editingKey =
    editingDate
      ? getDateKey(editingDate)
      : null;

  const editingAnswer =
    editingKey
      ? data[editingKey]?.answer
      : null;

  const changeMonth = (direction) => {
    setSelectedMonth((current) => {
      const newDate =
        new Date(current);

      newDate.setMonth(
        newDate.getMonth() +
          direction
      );

      return newDate;
    });
  };

  const changeYear = (direction) => {
    setSelectedMonth((current) => {
      const newDate =
        new Date(current);

      newDate.setFullYear(
        newDate.getFullYear() +
          direction
      );

      return newDate;
    });
  };

  const openMonth = (month) => {
    setSelectedMonth(
      new Date(
        selectedMonth.getFullYear(),
        month,
        1
      )
    );

    setProgressView("month");
  };

  if (loading) {
    return (
      <main className="app">
        <div
          className="phoneShell"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              color: "#526d69",
              fontWeight: 700,
            }}
          >
            טוען את המסע שלך… 🤍
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="phoneShell">
        {syncError && (
          <div
            style={{
              position: "fixed",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 200,
              padding: "10px 16px",
              borderRadius: 999,
              background: "#fde8ee",
              color: "#bd5873",
              fontSize: 12,
              fontWeight: 800,
              boxShadow:
                "0 8px 25px rgba(0,0,0,0.08)",
            }}
          >
            {syncError}
          </div>
        )}

        {celebration && (
          <div
            className={`milestoneOverlay ${celebration.level}`}
          >
            <div className="milestoneGlow" />

            <div className="milestoneSpark sparkOne">
              ✦
            </div>

            <div className="milestoneSpark sparkTwo">
              ✧
            </div>

            <div className="milestoneSpark sparkThree">
              ✦
            </div>

            <div className="milestoneSpark sparkFour">
              ✧
            </div>

            <div className="milestoneContent">
              <div className="milestoneEmoji">
                {celebration.emoji}
              </div>

              <span className="milestoneLabel">
                MILESTONE
              </span>

              <div className="milestoneNumber">
                {celebration.days}
              </div>

              <div className="milestoneDays">
                ימים ברצף
              </div>

              <h2>
                {celebration.title}
              </h2>

              <p>
                {celebration.message}
              </p>

              <div className="signature">
                באהבה, גיא ❤️
              </div>

              <button
                className="celebrationButton"
                onClick={() =>
                  setCelebration(null)
                }
              >
                ממשיכים ✨
              </button>
            </div>
          </div>
        )}

        {editingDate && (
          <div
            className="dayEditorBackdrop"
            onClick={() =>
              setEditingDate(null)
            }
          >
            <div
              className="dayEditorModal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                className="dayEditorClose"
                onClick={() =>
                  setEditingDate(null)
                }
              >
                ×
              </button>

              <p className="dayEditorEyebrow">
                עריכת יום
              </p>

              <h2>
                {editingDate.toLocaleDateString(
                  "he-IL",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                )}
              </h2>

              {editingAnswer && (
                <div
                  className={`dayEditorCurrent ${
                    editingAnswer === "yes"
                      ? "dayEditorCurrentYes"
                      : "dayEditorCurrentNo"
                  }`}
                >
                  כרגע מסומן:{" "}
                  <strong>
                    {editingAnswer === "yes"
                      ? "עמדתי במטרה ✓"
                      : "לא היום ♡"}
                  </strong>
                </div>
              )}

              <div className="dayEditorActions">
                <button
                  className="dayEditorYes"
                  onClick={() =>
                    updateCalendarDay("yes")
                  }
                >
                  ✓ עמדתי במטרה
                </button>

                <button
                  className="dayEditorNo"
                  onClick={() =>
                    updateCalendarDay("no")
                  }
                >
                  ♡ לא היום
                </button>
              </div>

              {editingAnswer && (
                <button
                  className="dayEditorDelete"
                  onClick={() =>
                    updateCalendarDay(null)
                  }
                >
                  מחיקת הסימון
                </button>
              )}
            </div>
          </div>
        )}

        {screen === "today" && (
          <section className="todayScreen">
            <div className="topBadge">
              ♥
            </div>

            <p className="eyebrow">
              היום
            </p>

            <h1>
              מיטב, עמדת היום במטרה שלך?
            </h1>

            {!answer && (
              <>
                <p className="subtitle">
                  לא צריך להיות מושלמת.
                  רק להמשיך לבחור בעצמך 🤍
                </p>

                <div className="buttons">
                  <button
                    className="yes"
                    onClick={handleYes}
                  >
                    כן ❤️
                  </button>

                  <button
                    className="no"
                    onClick={handleNo}
                  >
                    לא היום
                  </button>
                </div>
              </>
            )}

            {answer && (
              <div className="result">
                <div
                  className={`resultIcon ${
                    answer === "yes"
                      ? "resultYes"
                      : "resultNo"
                  }`}
                >
                  {answer === "yes"
                    ? "✓"
                    : "♡"}
                </div>

                <h2>{message}</h2>

                <p>
                  {answer === "yes"
                    ? "עוד יום קטן שעושה הבדל גדול ✨"
                    : "היום נגמר. הדרך ממשיכה מחר."}
                </p>

                <button
                  className="editButton"
                  onClick={resetToday}
                >
                  שיניתי את דעתי
                </button>
              </div>
            )}

            <div className="miniStats">
              <div>
                <span className="statIcon">
                  🔥
                </span>

                <strong>
                  {streak}
                </strong>

                <span>
                  רצף נוכחי
                </span>
              </div>

              <div>
                <span className="statIcon">
                  ✓
                </span>

                <strong>
                  {monthInfo.yesCount}
                </strong>

                <span>
                  הצלחות החודש
                </span>
              </div>
            </div>
          </section>
        )}

        {screen === "progress" && (
          <section className="progressScreen">
            <div className="progressHeader">
              <div>
                <p className="eyebrow">
                  התקדמות
                </p>

                <h1>
                  המסע שלך
                </h1>
              </div>

              <div className="heartMini">
                ♥
              </div>
            </div>

            <div className="heroStats">
              <div className="heroStat">
                <span>
                  הרצף הכי ארוך
                </span>

                <strong>
                  {bestStreak}
                </strong>

                <small>
                  ימים
                </small>
              </div>

              <div className="heroDivider" />

              <div className="heroStat">
                <span>
                  Total wins
                </span>

                <strong>
                  {totalWins}
                </strong>

                <small>
                  ימים מוצלחים
                </small>
              </div>
            </div>

            <div className="viewSwitch">
              <button
                className={
                  progressView === "month"
                    ? "viewActive"
                    : ""
                }
                onClick={() =>
                  setProgressView("month")
                }
              >
                חודש
              </button>

              <button
                className={
                  progressView === "year"
                    ? "viewActive"
                    : ""
                }
                onClick={() =>
                  setProgressView("year")
                }
              >
                שנה
              </button>
            </div>

            {progressView === "month" && (
              <>
                <div className="monthCard">
                  <div className="monthHeader">
                    <button
                      onClick={() =>
                        changeMonth(-1)
                      }
                    >
                      ‹
                    </button>

                    <div>
                      <h2>
                        {monthNames[monthInfo.month]}
                      </h2>

                      <span>
                        {monthInfo.year}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        changeMonth(1)
                      }
                    >
                      ›
                    </button>
                  </div>

                  <div className="weekDays">
                    {weekDays.map((day) => (
                      <span key={day}>
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="calendar">
                    {monthInfo.days.map(
                      (item, index) => {
                        if (!item) {
                          return (
                            <div
                              key={`empty-${index}`}
                            />
                          );
                        }

                        return (
                          <button
                            key={item.key}
                            type="button"
                            disabled={item.future}
                            onClick={() => {
                              if (!item.future) {
                                setEditingDate(
                                  item.date
                                );
                              }
                            }}
                            className={`day ${
                              item.status === "yes"
                                ? "dayYes"
                                : item.status === "no"
                                ? "dayNo"
                                : ""
                            } ${
                              item.future
                                ? "dayFuture"
                                : "dayClickable"
                            }`}
                          >
                            {item.status === "yes"
                              ? "✓"
                              : item.status === "no"
                              ? "♡"
                              : item.day}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="statsGrid">
                  <div className="statCard">
                    <span>
                      הצלחה
                    </span>

                    <strong>
                      {monthInfo.successRate}%
                    </strong>
                  </div>

                  <div className="statCard">
                    <span>
                      עמדת במטרה
                    </span>

                    <strong>
                      {monthInfo.yesCount}
                    </strong>
                  </div>

                  <div className="statCard">
                    <span>
                      לא היום
                    </span>

                    <strong>
                      {monthInfo.noCount}
                    </strong>
                  </div>

                  <div className="statCard">
                    <span>
                      רצף נוכחי
                    </span>

                    <strong>
                      {streak}
                    </strong>
                  </div>
                </div>
              </>
            )}

            {progressView === "year" && (
              <>
                <div className="yearHeader">
                  <button
                    onClick={() =>
                      changeYear(-1)
                    }
                  >
                    ‹
                  </button>

                  <h2>
                    {selectedMonth.getFullYear()}
                  </h2>

                  <button
                    onClick={() =>
                      changeYear(1)
                    }
                  >
                    ›
                  </button>
                </div>

                <div className="yearGrid">
                  {yearStats.map(
                    (month) => (
                      <button
                        key={month.name}
                        className="yearMonthCard"
                        onClick={() =>
                          openMonth(month.month)
                        }
                      >
                        <div className="yearMonthTop">
                          <span>
                            {month.name}
                          </span>

                          <strong>
                            {month.successRate}%
                          </strong>
                        </div>

                        <div className="progressTrack">
                          <div
                            className="progressFill"
                            style={{
                              width: `${month.successRate}%`,
                            }}
                          />
                        </div>

                        <div className="yearMonthBottom">
                          <span>
                            {month.yesCount} ✓
                          </span>

                          <span>
                            {month.answeredCount} ימים
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </>
            )}

            <div className="achievementsCard">
              <div className="achievementsHeader">
                <div>
                  <p className="sectionEyebrow">
                    MILESTONES
                  </p>

                  <h2>
                    ההישגים שלך
                  </h2>
                </div>

                <span className="achievementCount">
                  {unlockedMilestones.length}/
                  {milestones.length}
                </span>
              </div>

              <div className="achievementRow">
                {milestones.map(
                  (milestone) => {
                    const unlocked =
                      bestStreak >=
                      milestone.days;

                    return (
                      <div
                        key={milestone.days}
                        className={`achievement ${
                          unlocked
                            ? "achievementUnlocked"
                            : "achievementLocked"
                        }`}
                      >
                        <div className="achievementBubble">
                          {unlocked
                            ? milestone.emoji
                            : "🔒"}
                        </div>

                        <strong>
                          {milestone.days}
                        </strong>

                        <span>
                          ימים
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {nextMilestone ? (
                <div className="nextMilestone">
                  <div className="nextMilestoneText">
                    <span>
                      הבא בתור
                    </span>

                    <strong>
                      {nextMilestone.emoji}{" "}
                      {nextMilestone.days} ימים
                    </strong>
                  </div>

                  <div className="nextProgress">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (streak /
                              nextMilestone.days) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="allUnlocked">
                  👑 פתחת את כל ההישגים!
                </div>
              )}
            </div>

            <div className="legend">
              <div>
                <span className="legendDot yesDot" />
                עמדת במטרה
              </div>

              <div>
                <span className="legendDot noDot" />
                לא היום
              </div>

              <div>
                <span className="legendDot emptyDot" />
                עדיין לא סומן
              </div>
            </div>
          </section>
        )}

        <nav className="bottomNav">
          <button
            className={
              screen === "today"
                ? "activeNav"
                : ""
            }
            onClick={() =>
              setScreen("today")
            }
          >
            <span>♥</span>
            היום
          </button>

          <button
            className={
              screen === "progress"
                ? "activeNav"
                : ""
            }
            onClick={() =>
              setScreen("progress")
            }
          >
            <span>◫</span>
            התקדמות
          </button>
        </nav>
      </div>
    </main>
  );
}

export default App;