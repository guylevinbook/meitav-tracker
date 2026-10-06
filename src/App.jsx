import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "./lib/supabase";
import { enablePushNotifications } from "./lib/push";
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
    message:
      "30 ימים ברצף. זה כבר לא רק להתחיל — זה באמת להתמיד.",
    level: "monthMilestone",
  },
  {
    days: 60,
    emoji: "💎",
    title: "חודשיים!",
    message:
      "60 ימים. תעצרי שנייה ותביני כמה רחוק כבר הגעת.",
    level: "twoMonths",
  },
  {
    days: 90,
    emoji: "👑",
    title: "90 ימים!",
    message:
      "90 ימים ברצף. את פסיכית, ואני גאה בך ברמות ❤️",
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

const weekDays = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ש",
];

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function getRandomMessage(messages) {
  return messages[
    Math.floor(
      Math.random() *
        messages.length
    )
  ];
}

function rowsToData(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      row.entry_date,
      {
        answer: row.answer,
        message: row.message,
      },
    ])
  );
}

function isFutureDate(date) {
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const check = new Date(date);

  check.setHours(
    0,
    0,
    0,
    0
  );

  return check > today;
}

function calculateCurrentStreak(data) {
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const todayKey =
    getDateKey(today);

  if (
    data[todayKey]?.answer ===
    "no"
  ) {
    return 0;
  }

  let cursor =
    new Date(today);

  if (
    !data[todayKey]
  ) {
    cursor.setDate(
      cursor.getDate() - 1
    );
  }

  let streak = 0;

  while (true) {
    const key =
      getDateKey(cursor);

    if (
      data[key]?.answer !==
      "yes"
    ) {
      break;
    }

    streak += 1;

    cursor.setDate(
      cursor.getDate() - 1
    );
  }

  return streak;
}

function calculateBestStreak(data) {
  const yesDates =
    Object.entries(data)
      .filter(
        ([, value]) =>
          value.answer === "yes"
      )
      .map(([key]) =>
        dateFromKey(key)
      )
      .sort(
        (a, b) =>
          a.getTime() -
          b.getTime()
      );

  if (!yesDates.length) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (
    let i = 1;
    i < yesDates.length;
    i += 1
  ) {
    const previous =
      new Date(
        yesDates[i - 1]
      );

    previous.setDate(
      previous.getDate() + 1
    );

    if (
      getDateKey(previous) ===
      getDateKey(
        yesDates[i]
      )
    ) {
      current += 1;
      best = Math.max(
        best,
        current
      );
    } else {
      current = 1;
    }
  }

  return best;
}

function getCurrentStreakStart(
  data
) {
  const today =
    new Date();

  const todayKey =
    getDateKey(today);

  if (
    data[todayKey]?.answer !==
    "yes"
  ) {
    return null;
  }

  let cursor =
    new Date(today);

  while (true) {
    const previous =
      new Date(cursor);

    previous.setDate(
      previous.getDate() - 1
    );

    const previousKey =
      getDateKey(previous);

    if (
      data[previousKey]
        ?.answer !== "yes"
    ) {
      break;
    }

    cursor = previous;
  }

  return getDateKey(cursor);
}

function getMonthStats(
  data,
  year,
  month
) {
  let yes = 0;
  let no = 0;

  Object.entries(data).forEach(
    ([key, entry]) => {
      const date =
        dateFromKey(key);

      if (
        date.getFullYear() !==
          year ||
        date.getMonth() !==
          month
      ) {
        return;
      }

      if (
        entry.answer === "yes"
      ) {
        yes += 1;
      }

      if (
        entry.answer === "no"
      ) {
        no += 1;
      }
    }
  );

  const total = yes + no;

  return {
    yes,
    no,
    total,
    percentage:
      total > 0
        ? Math.round(
            (yes / total) *
              100
          )
        : 0,
  };
}

function App() {
  const today = useMemo(
    () => new Date(),
    []
  );

  const todayKey =
    getDateKey(today);

  const [
    screen,
    setScreen,
  ] = useState("today");

  const [
    progressView,
    setProgressView,
  ] = useState("month");

  const [
    data,
    setData,
  ] = useState({});

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const [
    celebration,
    setCelebration,
  ] = useState(null);

  const [
    editingDate,
    setEditingDate,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    syncError,
    setSyncError,
  ] = useState("");

  const [
    notificationStatus,
    setNotificationStatus,
  ] = useState("");

  const todayEntry =
    data[todayKey];

  const streak =
    calculateCurrentStreak(
      data
    );

  const bestStreak =
    calculateBestStreak(
      data
    );

  const currentMonthStats =
    getMonthStats(
      data,
      selectedMonth.getFullYear(),
      selectedMonth.getMonth()
    );

  const nextMilestone =
    milestones.find(
      (milestone) =>
        milestone.days >
        streak
    );

  const unlockedCount =
    milestones.filter(
      (milestone) =>
        bestStreak >=
        milestone.days
    ).length;

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    setSyncError("");

    const {
      data: rows,
      error,
    } = await supabase
      .from("daily_entries")
      .select(
        "entry_date, answer, message"
      )
      .order(
        "entry_date",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(error);

      setSyncError(
        "לא הצלחתי לטעון את הנתונים 🤍"
      );
    } else {
      setData(
        rowsToData(
          rows || []
        )
      );
    }

    setLoading(false);
  }

  function launchCelebrationEffects(
    milestone
  ) {
    setCelebration(
      milestone
    );

    confetti({
      particleCount: 110,
      spread: 85,
      origin: {
        y: 0.65,
      },
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: {
          x: 0,
          y: 0.65,
        },
      });

      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: {
          x: 1,
          y: 0.65,
        },
      });
    }, 450);
  }

  async function checkMilestone(
    newData
  ) {
    const newStreak =
      calculateCurrentStreak(
        newData
      );

    const milestone =
      milestones.find(
        (item) =>
          item.days ===
          newStreak
      );

    if (!milestone) {
      return;
    }

    const streakStart =
      getCurrentStreakStart(
        newData
      );

    if (!streakStart) {
      return;
    }

    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from(
        "milestone_celebrations"
      )
      .select("id")
      .eq(
        "streak_start",
        streakStart
      )
      .eq(
        "milestone_days",
        milestone.days
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        lookupError
      );
      return;
    }

    if (existing) {
      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from(
        "milestone_celebrations"
      )
      .insert({
        streak_start:
          streakStart,
        milestone_days:
          milestone.days,
      });

    if (insertError) {
      console.error(
        insertError
      );

      return;
    }

    launchCelebrationEffects(
      milestone
    );
  }

  async function upsertEntry(
    entryDate,
    value,
    selectedMessage
  ) {
    const { error } =
      await supabase
        .from(
          "daily_entries"
        )
        .upsert(
          {
            entry_date:
              entryDate,
            answer: value,
            message:
              selectedMessage,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "entry_date",
          }
        );

    if (error) {
      console.error(error);

      setSyncError(
        "לא הצלחתי לשמור. נסי שוב 🤍"
      );

      return false;
    }

    setSyncError("");

    return true;
  }

  async function deleteEntry(
    entryDate
  ) {
    const { error } =
      await supabase
        .from(
          "daily_entries"
        )
        .delete()
        .eq(
          "entry_date",
          entryDate
        );

    if (error) {
      console.error(error);

      setSyncError(
        "לא הצלחתי למחוק. נסי שוב 🤍"
      );

      return false;
    }

    setSyncError("");

    return true;
  }

  async function saveAnswer(
    value,
    selectedMessage
  ) {
    const success =
      await upsertEntry(
        todayKey,
        value,
        selectedMessage
      );

    if (!success) {
      return false;
    }

    const newData = {
      ...data,
      [todayKey]: {
        answer: value,
        message:
          selectedMessage,
      },
    };

    setData(newData);

    if (value === "yes") {
      await checkMilestone(
        newData
      );
    }

    return true;
  }

  async function handleYes() {
    const selectedMessage =
      getRandomMessage(
        successMessages
      );

    const success =
      await saveAnswer(
        "yes",
        selectedMessage
      );

    if (!success) {
      return;
    }

    confetti({
      particleCount: 80,
      spread: 65,
      origin: {
        y: 0.72,
      },
    });
  }

  async function handleNo() {
    const selectedMessage =
      getRandomMessage(
        supportMessages
      );

    await saveAnswer(
      "no",
      selectedMessage
    );
  }

  async function resetToday() {
    const success =
      await deleteEntry(
        todayKey
      );

    if (!success) {
      return;
    }

    const newData = {
      ...data,
    };

    delete newData[todayKey];

    setData(newData);
  }

  async function updateCalendarDay(
    value
  ) {
    if (!editingDate) {
      return;
    }

    const message =
      value === "yes"
        ? getRandomMessage(
            successMessages
          )
        : getRandomMessage(
            supportMessages
          );

    const success =
      await upsertEntry(
        editingDate,
        value,
        message
      );

    if (!success) {
      return;
    }

    const newData = {
      ...data,
      [editingDate]: {
        answer: value,
        message,
      },
    };

    setData(newData);

    setEditingDate(null);

    if (value === "yes") {
      await checkMilestone(
        newData
      );
    }
  }

  async function removeCalendarDay() {
    if (!editingDate) {
      return;
    }

    const success =
      await deleteEntry(
        editingDate
      );

    if (!success) {
      return;
    }

    const newData = {
      ...data,
    };

    delete newData[
      editingDate
    ];

    setData(newData);

    setEditingDate(null);
  }

  async function handleEnableNotifications() {
    try {
      setNotificationStatus(
        "מפעיל..."
      );

      await enablePushNotifications();

      setNotificationStatus(
        "התזכורת הופעלה ✓"
      );
    } catch (error) {
      console.error(error);

      setNotificationStatus(
        error?.message ||
          "לא הצלחתי להפעיל התראות"
      );
    }
  }

  function changeMonth(amount) {
    setSelectedMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            amount,
          1
        )
    );
  }

  function changeYear(amount) {
    setSelectedMonth(
      (current) =>
        new Date(
          current.getFullYear() +
            amount,
          current.getMonth(),
          1
        )
    );
  }

  function buildCalendarDays() {
    const year =
      selectedMonth.getFullYear();

    const month =
      selectedMonth.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const items = [];

    for (
      let i = 0;
      i < firstDay;
      i += 1
    ) {
      items.push(
        <div
          key={`empty-${i}`}
        />
      );
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {
      const date =
        new Date(
          year,
          month,
          day
        );

      const key =
        getDateKey(date);

      const entry =
        data[key];

      const future =
        isFutureDate(date);

      let className =
        "day";

      if (
        entry?.answer ===
        "yes"
      ) {
        className +=
          " dayYes";
      }

      if (
        entry?.answer ===
        "no"
      ) {
        className +=
          " dayNo";
      }

      if (future) {
        className +=
          " dayFuture";
      } else {
        className +=
          " dayClickable";
      }

      items.push(
        <button
          key={key}
          className={
            className
          }
          disabled={future}
          onClick={() =>
            !future &&
            setEditingDate(
              key
            )
          }
        >
          {entry?.answer ===
          "no"
            ? "♡"
            : day}
        </button>
      );
    }

    return items;
  }

  function renderToday() {
    return (
      <main className="todayScreen">
        <div className="topBadge">
          ♡
        </div>

        <p className="eyebrow">
          היום שלך
        </p>

        <h1>
          איך היה היום?
        </h1>

        {!todayEntry ? (
          <>
            <p className="subtitle">
              עוד סימון קטן
              בדרך למטרה שלך.
              בלי לחץ, רק
              עקביות 🤍
            </p>

            <div className="buttons">
              <button
                className="yes"
                onClick={
                  handleYes
                }
              >
                כן, עמדתי בזה
                💚
              </button>

              <button
                className="no"
                onClick={
                  handleNo
                }
              >
                לא היום
              </button>
            </div>
          </>
        ) : (
          <div className="result">
            <div
              className={`resultIcon ${
                todayEntry.answer ===
                "yes"
                  ? "resultYes"
                  : "resultNo"
              }`}
            >
              {todayEntry.answer ===
              "yes"
                ? "✓"
                : "♡"}
            </div>

            <h2>
              {
                todayEntry.message
              }
            </h2>

            <p>
              היום כבר מסומן
            </p>

            <button
              className="editButton"
              onClick={
                resetToday
              }
            >
              שיניתי את דעתי
            </button>
          </div>
        )}

        <div className="miniStats">
          <div>
            <div className="statIcon">
              🔥
            </div>

            <strong>
              {streak}
            </strong>

            <span>
              רצף נוכחי
            </span>
          </div>

          <div>
            <div className="statIcon">
              🏆
            </div>

            <strong>
              {bestStreak}
            </strong>

            <span>
              שיא אישי
            </span>
          </div>
        </div>

        <div className="notificationCard">
          <div>
            <strong>
              תזכורת יומית 🔔
            </strong>

            <span>
              קבלי תזכורת
              אם עוד לא
              סימנת היום
            </span>
          </div>

          <button
            onClick={
              handleEnableNotifications
            }
          >
            הפעלת תזכורת
          </button>

          {notificationStatus && (
            <small>
              {
                notificationStatus
              }
            </small>
          )}
        </div>
      </main>
    );
  }

  function renderMonth() {
    return (
      <>
        <div className="monthCard">
          <div className="monthHeader">
            <button
              onClick={() =>
                changeMonth(1)
              }
            >
              ‹
            </button>

            <div>
              <h2>
                {
                  monthNames[
                    selectedMonth.getMonth()
                  ]
                }
              </h2>

              <span>
                {selectedMonth.getFullYear()}
              </span>
            </div>

            <button
              onClick={() =>
                changeMonth(-1)
              }
            >
              ›
            </button>
          </div>

          <div className="weekDays">
            {weekDays.map(
              (day) => (
                <span
                  key={day}
                >
                  {day}
                </span>
              )
            )}
          </div>

          <div className="calendar">
            {buildCalendarDays()}
          </div>
        </div>

        <div className="statsGrid">
          <div className="statCard">
            <span>
              ימים שסומנו
            </span>

            <strong>
              {
                currentMonthStats.total
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              ימים במטרה
            </span>

            <strong>
              {
                currentMonthStats.yes
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              לא היום
            </span>

            <strong>
              {
                currentMonthStats.no
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              אחוז הצלחה
            </span>

            <strong>
              {
                currentMonthStats.percentage
              }
              %
            </strong>
          </div>
        </div>
      </>
    );
  }

  function renderYear() {
    const year =
      selectedMonth.getFullYear();

    return (
      <>
        <div className="yearHeader">
          <button
            onClick={() =>
              changeYear(1)
            }
          >
            ‹
          </button>

          <h2>{year}</h2>

          <button
            onClick={() =>
              changeYear(-1)
            }
          >
            ›
          </button>
        </div>

        <div className="yearGrid">
          {monthNames.map(
            (
              monthName,
              monthIndex
            ) => {
              const stats =
                getMonthStats(
                  data,
                  year,
                  monthIndex
                );

              return (
                <button
                  key={
                    monthName
                  }
                  className="yearMonthCard"
                  onClick={() => {
                    setSelectedMonth(
                      new Date(
                        year,
                        monthIndex,
                        1
                      )
                    );

                    setProgressView(
                      "month"
                    );
                  }}
                >
                  <div className="yearMonthTop">
                    <span>
                      {
                        monthName
                      }
                    </span>

                    <strong>
                      {
                        stats.percentage
                      }
                      %
                    </strong>
                  </div>

                  <div className="yearMonthBottom">
                    <span>
                      {
                        stats.yes
                      }{" "}
                      הצלחות
                    </span>

                    <span>
                      {
                        stats.total
                      }{" "}
                      ימים
                    </span>
                  </div>

                  <div className="progressTrack">
                    <div
                      className="progressFill"
                      style={{
                        width: `${stats.percentage}%`,
                      }}
                    />
                  </div>
                </button>
              );
            }
          )}
        </div>
      </>
    );
  }

  function renderAchievements() {
    return (
      <div className="achievementsCard">
        <div className="achievementsHeader">
          <div>
            <p className="sectionEyebrow">
              ACHIEVEMENTS
            </p>

            <h2>
              ההישגים שלך
            </h2>
          </div>

          <div className="achievementCount">
            {unlockedCount}/
            {milestones.length}
          </div>
        </div>

        <div className="achievementRow">
          {milestones.map(
            (milestone) => {
              const unlocked =
                bestStreak >=
                milestone.days;

              return (
                <div
                  key={
                    milestone.days
                  }
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
                    {
                      milestone.days
                    }
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
                היעד הבא
              </span>

              <strong>
                {streak}/
                {
                  nextMilestone.days
                }{" "}
                ימים
              </strong>
            </div>

            <div className="nextProgress">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (streak /
                      nextMilestone.days) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="allUnlocked">
            פתחת את כל
            ההישגים 👑
          </div>
        )}
      </div>
    );
  }

  function renderProgress() {
    return (
      <main className="progressScreen">
        <div className="progressHeader">
          <div>
            <p className="eyebrow">
              המסע שלך
            </p>

            <h1>
              התקדמות
            </h1>
          </div>

          <div className="heartMini">
            ♡
          </div>
        </div>

        <div className="heroStats">
          <div className="heroStat">
            <span>
              רצף נוכחי
            </span>

            <strong>
              {streak}
            </strong>

            <small>
              ימים
            </small>
          </div>

          <div className="heroDivider" />

          <div className="heroStat">
            <span>
              השיא שלך
            </span>

            <strong>
              {bestStreak}
            </strong>

            <small>
              ימים
            </small>
          </div>
        </div>

        <div className="viewSwitch">
          <button
            className={
              progressView ===
              "month"
                ? "viewActive"
                : ""
            }
            onClick={() =>
              setProgressView(
                "month"
              )
            }
          >
            חודש
          </button>

          <button
            className={
              progressView ===
              "year"
                ? "viewActive"
                : ""
            }
            onClick={() =>
              setProgressView(
                "year"
              )
            }
          >
            שנה
          </button>
        </div>

        {progressView ===
        "month"
          ? renderMonth()
          : renderYear()}

        {renderAchievements()}

        <div className="legend">
          <div>
            <span className="legendDot yesDot" />
            עמדתי במטרה
          </div>

          <div>
            <span className="legendDot noDot" />
            לא היום
          </div>

          <div>
            <span className="legendDot emptyDot" />
            לא סומן
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loadingScreen">
          <div>
            ♡
          </div>

          <p>
            טוען את המסע
            שלך… 🤍
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="phoneShell">
        {screen === "today"
          ? renderToday()
          : renderProgress()}

        {syncError && (
          <div className="syncError">
            {syncError}
          </div>
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
            <span>♡</span>
            היום
          </button>

          <button
            className={
              screen ===
              "progress"
                ? "activeNav"
                : ""
            }
            onClick={() =>
              setScreen(
                "progress"
              )
            }
          >
            <span>◷</span>
            התקדמות
          </button>
        </nav>
      </div>

      {editingDate && (
        <div
          className="dayEditorBackdrop"
          onClick={() =>
            setEditingDate(
              null
            )
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
                setEditingDate(
                  null
                )
              }
            >
              ×
            </button>

            <p className="dayEditorEyebrow">
              עריכת יום
            </p>

            <h2>
              {dateFromKey(
                editingDate
              ).toLocaleDateString(
                "he-IL",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </h2>

            {data[
              editingDate
            ] && (
              <div
                className={`dayEditorCurrent ${
                  data[
                    editingDate
                  ].answer ===
                  "yes"
                    ? "dayEditorCurrentYes"
                    : "dayEditorCurrentNo"
                }`}
              >
                כרגע מסומן:{" "}
                {data[
                  editingDate
                ].answer ===
                "yes"
                  ? "עמדתי במטרה ✓"
                  : "לא היום ♡"}
              </div>
            )}

            <div className="dayEditorActions">
              <button
                className="dayEditorYes"
                onClick={() =>
                  updateCalendarDay(
                    "yes"
                  )
                }
              >
                עמדתי בזה ✓
              </button>

              <button
                className="dayEditorNo"
                onClick={() =>
                  updateCalendarDay(
                    "no"
                  )
                }
              >
                לא היום ♡
              </button>
            </div>

            {data[
              editingDate
            ] && (
              <button
                className="dayEditorDelete"
                onClick={
                  removeCalendarDay
                }
              >
                מחיקת הסימון
              </button>
            )}
          </div>
        </div>
      )}

      {celebration && (
        <div
          className={`milestoneOverlay ${celebration.level}`}
        >
          <div className="milestoneGlow" />

          <span className="milestoneSpark sparkOne">
            ✦
          </span>

          <span className="milestoneSpark sparkTwo">
            ✧
          </span>

          <span className="milestoneSpark sparkThree">
            ✦
          </span>

          <span className="milestoneSpark sparkFour">
            ✧
          </span>

          <div className="milestoneContent">
            <div className="milestoneEmoji">
              {
                celebration.emoji
              }
            </div>

            <div className="milestoneLabel">
              MILESTONE
            </div>

            <div className="milestoneNumber">
              {
                celebration.days
              }
            </div>

            <div className="milestoneDays">
              ימים ברצף
            </div>

            <h2>
              {
                celebration.title
              }
            </h2>

            <p>
              {
                celebration.message
              }
            </p>

            <div className="signature">
              באהבה, גיא ❤️
            </div>

            <button
              className="celebrationButton"
              onClick={() =>
                setCelebration(
                  null
                )
              }
            >
              ממשיכים 💚
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;