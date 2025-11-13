const express = require('express');
const app = express();
app.use(express.json());

function calculateWorkingSeconds({
  start,
  end,
  shiftStart,
  shiftEnd,
  saturdayHoliday,
  generalHolidays
}) {
  const dtStart = new Date(start);
  const dtEnd   = new Date(end);
  const [shH, shM] = shiftStart.split(':').map(x => parseInt(x, 10));
  const [seH, seM] = shiftEnd.split(':').map(x => parseInt(x, 10));
  const genHols = new Set((generalHolidays || []).map(d => new Date(d).toDateString()));

  if (dtEnd < dtStart) {
    throw new Error('end must be after start');
  }

  let totalMs = 0;
  let cur = new Date(dtStart);
  const oneDayMs = 24 * 60 * 60 * 1000;

  while (cur.toDateString() !== dtEnd.toDateString()) {
    const weekday = cur.getDay(); // Sunday=0, Monday=1,... Saturday=6
    const isSunday = (weekday === 0);
    const isSaturday = (weekday === 6);

    if (!isSunday && !(saturdayHoliday && isSaturday) && !genHols.has(cur.toDateString())) {
      const shiftStartDt = new Date(cur);
      shiftStartDt.setHours(shH, shM, 0, 0);
      const shiftEndDt   = new Date(cur);
      shiftEndDt.setHours(seH, seM, 0, 0);

      const dayStart = cur > shiftStartDt ? cur : shiftStartDt;
      const dayEnd   = shiftEndDt;

      if (dayEnd > dayStart) {
        totalMs += (dayEnd - dayStart);
      }
    }

    // next day at midnight
    cur = new Date(cur.getTime() + oneDayMs);
    cur.setHours(0,0,0,0,0);
  }

  // Handle final day
  const finalDate = dtEnd;
  const weekdayF = finalDate.getDay();
  const isSunF = (weekdayF === 0);
  const isSatF = (weekdayF === 6);

  if (!isSunF && !(saturdayHoliday && isSatF) && !genHols.has(finalDate.toDateString())) {
    const shiftStartDt = new Date(finalDate);
    shiftStartDt.setHours(shH, shM, 0, 0);
    const shiftEndDt   = new Date(finalDate);
    shiftEndDt.setHours(seH, seM, 0, 0);

    const dayStart = (dtStart.toDateString() === finalDate.toDateString() && dtStart > shiftStartDt)
                     ? dtStart : shiftStartDt;
    const dayEnd   = dtEnd < shiftEndDt ? dtEnd : shiftEndDt;

    if (dayEnd > dayStart) {
      totalMs += (dayEnd - dayStart);
    }
  }

  // return seconds (rounded)
  return Math.round(totalMs / 1000);
}

app.post('/api/calc', (req, res) => {
  try {
    const seconds = calculateWorkingSeconds(req.body);
    res.send(seconds.toString());
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = app;
