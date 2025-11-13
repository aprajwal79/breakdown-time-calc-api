const express = require('express');
const app = express();
app.use(express.json());

function calculateWorkingHours({ start, end, shiftStart, shiftEnd, saturdayHoliday, generalHolidays }) {
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

  const oneDay = 24 * 60 * 60 * 1000;

  while (cur.toDateString() !== dtEnd.toDateString()) {
    const curDate = cur.getDate();
    const weekday = cur.getDay(); // Sunday=0, Monday=1,... Saturday=6
    const isSunday   = (weekday === 0);
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
    cur = new Date(cur.getTime() + oneDay);
    cur.setHours(0,0,0,0,0);
  }

  // final day (same date as dtEnd)
  const finalDate = dtEnd;
  const weekdayF = finalDate.getDay();
  const isSunF = (weekdayF === 0);
  const isSatF = (weekdayF === 6);

  if (!isSunF && !(saturdayHoliday && isSatF) && !genHols.has(finalDate.toDateString())) {
    const shiftStartDt = new Date(finalDate);
    shiftStartDt.setHours(shH, shM, 0, 0);
    const shiftEndDt   = new Date(finalDate);
    shiftEndDt.setHours(seH, seM, 0, 0);

    const dayStart = dtStart > shiftStartDt && dtStart.toDateString() === finalDate.toDateString()
                     ? dtStart : shiftStartDt;
    const dayEnd   = dtEnd < shiftEndDt ? dtEnd : shiftEndDt;

    if (dayEnd > dayStart) {
      totalMs += (dayEnd - dayStart);
    }
  }

  return totalMs / (1000 * 60 * 60);
}

app.post('/api/calc', (req, res) => {
  try {
    const workingHours = calculateWorkingHours(req.body);
    res.json({ workingHours });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = app;
