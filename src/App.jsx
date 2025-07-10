import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format } from "date-fns";
import { Calendar, Train, User, Star, Info, ArrowRight, ArrowLeft, BadgeCheck, BadgeX, Search, Ticket, UserCheck, AlertCircle, Loader2, Train as TrainIcon, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';

function buildApiUrl({ source, destination, date, quota }) {
  let url = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${source}&destinationStationCode=${destination}&addAvailabilityCache=true&excludeMultiTicketAlternates=false&excludeBoostAlternates=false&sortBy=DEFAULT&dateOfJourney=${date}&enableNearby=true&enableTG=true&tGPlan=CTG-15&showTGPrediction=false&tgColor=DEFAULT&showPredictionGlobal=true`;
  if (quota === "Ladies") url = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${source}&destinationStationCode=${destination}&addAvailabilityCache=true&excludeMultiTicketAlternates=false&&quota=ld&excludeBoostAlternates=false&sortBy=DEFAULT&dateOfJourney=${date}&enableNearby=true&enableTG=true&tGPlan=CTG-15&showTGPrediction=false&tgColor=DEFAULT&showPredictionGlobal=true`;
  if (quota === "Senior Citizens") url = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${source}&destinationStationCode=${destination}&addAvailabilityCache=true&excludeMultiTicketAlternates=false&&quota=ss&excludeBoostAlternates=false&sortBy=DEFAULT&dateOfJourney=${date}&enableNearby=true&enableTG=true&tGPlan=CTG-15&showTGPrediction=false&tgColor=DEFAULT&showPredictionGlobal=true`;
  
  return url;
}

function buildScheduleUrl({ date, trainNo }) {
  return `https://api.confirmtkt.com/api/trains/schedulewithintermediatestn?date=${date}&trainNo=${trainNo}&locale=en`;
}

const dayMap = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getRunningDays(runningDays) {
  // runningDays is a string like '0110101'
  return dayMap.map((d, i) => ({ day: d, active: runningDays[i] === '1' }));
}
async function onBookNow() {
  window.open("https://www.irctc.co.in/nget/train-search ", "_blank");
}

function getAvailabilityDates(train, selectedClass, todayDate) {
  // Simulate 7 days from todayDate
  const days = [];
  let date = new Date(todayDate.split('-').reverse().join('-'));
  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    let avl = null;
    if (selectedClass.endsWith(' (Tatkal)')) {
      avl = train.availabilityCacheTatkal?.[selectedClass.replace(' (Tatkal)', '')];
    } else {
      avl = train.availabilityCache?.[selectedClass];
    }
    // Simulate status for demo (in real, use API for each date)
    let status = avl ? avl.availabilityDisplayName : 'REGRET';
    let color = status.includes('WL') ? 'text-red-500' : status === 'REGRET' ? 'text-gray-400' : 'text-green-600';
    days.push({
      label,
      status,
      color,
      fare: avl ? avl.fare : null,
      date: d.toLocaleDateString('en-GB').split('/').reverse().join('-'),
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function TrainCard({ train, date, onViewSchedule, quota }) {
  const [selectedTab, setSelectedTab] = useState(0);
  let classTabs, getAvl;
  if (quota === "General") {
    classTabs = train.avlClassesSorted.map(cls => cls.replace('_TQ', ' (Tatkal)'));
    getAvl = (cls) => cls.endsWith(' (Tatkal)')
      ? train.availabilityCacheTatkal?.[cls.replace(' (Tatkal)', '')]
      : train.availabilityCache?.[cls.replace(' (Tatkal)', '')] || train.availabilityCache?.[cls];
  } else {
    classTabs = Object.keys(train.availabilityCacheForQuota || {});
    getAvl = (cls) => train.availabilityCacheForQuota?.[cls];
  }
  const selectedClass = classTabs[selectedTab];
  const avl = getAvl(selectedClass);
  const fare = avl ? avl.fare : null;
  const runningDays = getRunningDays(train.runningDays);

  // Only show availability for the selected date
  const d = new Date(date.split('-').reverse().join('-'));
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  let status = avl ? avl.availabilityDisplayName : 'REGRET';
  let color = status.includes('WL') ? 'text-red-500' : status === 'REGRET' ? 'text-gray-400' : 'text-green-600';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6 transition-all hover:shadow-2xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-2">
      <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{train.trainName} <span className="text-indigo-600 text-base font-semibold">({train.trainNumber})</span> <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold ml-2">{train.trainType || 'EXP'}</span></h2>
          </div>
          <div className="flex gap-1 mt-1 text-xs items-center">
            <span className="text-slate-400">Runs On:</span>
            {runningDays.map((d, i) => (
              <span key={i} className={d.active ? 'text-green-600 font-bold' : 'text-slate-400'}>{d.day}</span>
            ))}
            {train.hasPantry && <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1"><Info size={14}/>Pantry</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={16} /> {train.trainRating}</span>
          <button
            className="text-indigo-600 hover:underline text-sm font-semibold mt-2 md:mt-0"
            onClick={() => onViewSchedule(train.trainNumber, train.trainName)}
          >
            Train Schedule
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:gap-8 mb-4">
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <span className="text-2xl font-bold text-slate-800 flex items-center gap-1"><ArrowRight size={20}/>{train.departureTime}</span>
          <span className="text-slate-500 text-sm">| {train.fromStnName} | {date}</span>
        </div>
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:justify-end">
          <span className="text-2xl font-bold text-slate-800 flex items-center gap-1"><ArrowLeft size={20}/>{train.arrivalTime}</span>
          <span className="text-slate-500 text-sm">| {train.toStnName} | {(() => {
            const d = new Date(date.split('-').reverse().join('-'));
            d.setMinutes(d.getMinutes() + train.duration);
            return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
          })()}</span>
        </div>
      </div>
      {/* Tabs for classes */}
      <div className="flex gap-2 border-b border-slate-200 mb-4 overflow-x-auto">
        {classTabs.map((cls, idx) => (
          <button
            key={cls}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-all rounded-full ${idx === selectedTab ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-100 border-transparent text-slate-500 hover:text-green-600'}`}
            onClick={() => setSelectedTab(idx)}
          >
            {cls}
          </button>
        ))}
      </div>
      {/* Only one card for the selected date */}
      <div className="flex gap-3 pb-2 mb-2">
        <div className={`flex flex-col items-center min-w-[100px] rounded-lg p-2 border ${status === 'Available' ? 'bg-green-50 border-green-200' : status.includes('WL') ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-xs text-slate-500 font-medium mb-1">{label}</span>
          <span className={`font-bold text-lg ${color}`}>{status}</span>
        </div>
      </div>
      {/* Book Now and fare */}
      <div className="flex items-center gap-4 mt-4">
        <button onClick={() => onBookNow()} className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold px-6 py-2 rounded-lg shadow border border-orange-200 text-base flex items-center gap-1"><BadgeCheck size={18}/>Book Now</button>
        {fare && <span className="text-lg font-semibold text-slate-700 flex items-center gap-1">₹ {fare}</span>}
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><Info size={14}/> Please check <a href="https://enquiry.indianrail.gov.in/ntes/" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">NTES website</a> or <a href="https://play.google.com/store/apps/details?id=com.cris.nts" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">NTES app</a> for actual time before boarding</span>
      </div>
    </div>
  );
}

function MainPage() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [beforeSourceTrains, setBeforeSourceTrains] = useState([]);
  const [beforeLoading, setBeforeLoading] = useState(false);
  const [beforeError, setBeforeError] = useState(null);
  const [quota, setQuota] = useState("General");
  const navigate = useNavigate();

  // Helper to convert yyyy-mm-dd to dd-mm-yyyy
  function formatDateToDDMMYYYY(isoDate) {
    if (!isoDate) return "";
    const [yyyy, mm, dd] = isoDate.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  function formatDateToISO(ddmmyyyy) {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Helper to get Date object from dd-mm-yyyy
  function parseDDMMYYYYtoDate(ddmmyyyy) {
    if (!ddmmyyyy) return null;
    return parse(ddmmyyyy, "dd-MM-yyyy", new Date());
  }

  // Helper to get dd-mm-yyyy from Date object
  function formatDateObjToDDMMYYYY(dateObj) {
    if (!dateObj) return "";
    return format(dateObj, "dd-MM-yyyy");
  }

  const fetchTrains = async (params) => {
    setLoading(true);
    setError(null);
    setTrains([]);
    try {
      const url = buildApiUrl(params);
      const res = await fetch(url);
      const data = await res.json();
      setTrains(data.data.trainList || []);
    } catch (err) {
      setError("Failed to fetch train data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch trains from stations before the source
  const fetchBeforeSourceTrains = async (mainTrains) => {
    setBeforeLoading(true);
    setBeforeError(null);
    setBeforeSourceTrains([]);
    try {
      const allResults = [];
      for (const train of mainTrains) {
        const scheduleUrl = buildScheduleUrl({ date, trainNo: train.trainNumber });
        const scheduleRes = await fetch(scheduleUrl);
        if (!scheduleRes.ok) continue;
        const scheduleData = await scheduleRes.json();
        if (!scheduleData.Schedule) continue;
        const idx = scheduleData.Schedule.findIndex(
          s => s.StationCode.toLowerCase() === source.toLowerCase()
        );
        if (idx > 0) {
          let foundCount = 0;
          for (let i = idx - 1; i >= 0 && foundCount < 3; i--) {
            const beforeStation = scheduleData.Schedule[i];
            if (beforeStation.StationCode.toLowerCase() !== train.fromStnCode.toLowerCase()) {
              // Ensure the original source is in the route for this train
              const url = buildApiUrl({ source: beforeStation.StationCode, destination, date, quota });
              const res = await fetch(url);
              if (!res.ok) continue;
              const data = await res.json();
              if (data.data && data.data.trainList) {
                const found = data.data.trainList.find(t => t.trainNumber === train.trainNumber);
                if (found) {
                  // Check if at least one class has available seat (not REGRET or WL)
                  const hasAvailable = Object.values(found.availabilityCache || {}).concat(Object.values(found.availabilityCacheTatkal || {})).some(avl => avl && avl.availabilityDisplayName && !avl.availabilityDisplayName.includes('WL') && avl.availabilityDisplayName !== 'REGRET');
                  // Check if the original source is in the route
                  let hasOriginalSource = false;
                  if (found && found.trainNumber) {
                    const foundScheduleUrl = buildScheduleUrl({ date, trainNo: found.trainNumber });
                    const foundScheduleRes = await fetch(foundScheduleUrl);
                    if (foundScheduleRes.ok) {
                      const foundScheduleData = await foundScheduleRes.json();
                      if (foundScheduleData.Schedule) {
                        hasOriginalSource = foundScheduleData.Schedule.some(s => s.StationCode.toLowerCase() === source.toLowerCase());
                      }
                    }
                  }
                  if (hasAvailable && hasOriginalSource) {
                    allResults.push({ ...found, _fromStation: beforeStation.StationName, _fromStationCode: beforeStation.StationCode, _toStation: destination });
                    foundCount++;
                  }
                }
              }
            }
          }
        }
      }
      setBeforeSourceTrains(allResults);
    } catch (err) {
      setBeforeError("Failed to fetch trains from stations before source.");
    } finally {
      setBeforeLoading(false);
    }
  };

  useEffect(() => {
    fetchTrains({ source, destination, date, quota });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (trains.length > 0) {
      fetchBeforeSourceTrains(trains);
    } else {
      setBeforeSourceTrains([]);
    }
    // eslint-disable-next-line
  }, [trains, source, destination, date, quota]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTrains({ source, destination, date, quota });
  };

  const handleViewSchedule = (trainNo, trainName) => {
    navigate(`/schedule?trainNo=${trainNo}&date=${date}&trainName=${encodeURIComponent(trainName)}`);
  };

  const filteredBeforeTrains = beforeSourceTrains.filter(train => {
    const availableClasses = Object.entries(train.availabilityCache || {})
      .concat(Object.entries(train.availabilityCacheTatkal || {}))
      .filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'));
    return availableClasses.length > 0;
  });

  return (
    <main className="max-w-3xl mx-auto mt-8 px-4">
      <div className="flex justify-end mb-4">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow"
          onClick={() => navigate("/pnr")}
        >
          Check PNR
        </button>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200 flex flex-col gap-6 md:gap-0 md:grid md:grid-cols-4 md:items-end">
        {/* Source */}
        <div className="flex flex-col gap-2">
          <label className="text-slate-700 font-semibold mb-1">Source Code</label>
          <div className="flex items-center gap-2">
            <Train className="text-indigo-400" size={20} />
            <input
              type="text"
              className="py-2 border border-indigo-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              value={source}
              onChange={e => setSource(e.target.value.toUpperCase())}
              placeholder="  e.g. BVI"
              required
              maxLength={5}
            />
          </div>
        </div>
        {/* Destination */}
        <div className="flex flex-col gap-2">
          <label className="text-slate-700 font-semibold mb-1">Destination Code</label>
          <div className="flex items-center gap-2">
            <Train className="text-indigo-400" size={20} />
            <input
              type="text"
              className="py-2 border border-indigo-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              value={destination}
              onChange={e => setDestination(e.target.value.toUpperCase())}
              placeholder="  e.g. PNU"
              required
              maxLength={5}
            />
          </div>
        </div>
        {/* Date */}
        <div className="flex flex-col gap-2">
          <label className="text-slate-700 font-semibold mb-1">Date of Journey</label>
          <div className="flex items-center gap-2">
            <Calendar className="text-indigo-400 ml-2" size={20} />
            <DatePicker
              selected={parseDDMMYYYYtoDate(date)}
              onChange={dateObj => setDate(formatDateObjToDDMMYYYY(dateObj))}
              dateFormat="dd-MM-yyyy"
              className="py-2 pl-5 border border-indigo-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              calendarClassName="!border-indigo-200 !shadow-lg !rounded-xl"
              popperClassName="z-50"
              minDate={new Date()}
              placeholderText="Select date"
              showPopperArrow={false}
              todayButton="Today"
              autoComplete="off"
            />
          </div>
        </div>
        {/* Quota */}
        <div className="flex flex-col gap-2">
          <label className="text-slate-700 font-semibold mb-1">Quota</label>
          <div className="flex items-center gap-2">
            <User className="text-indigo-400" size={20} />
            <select
              className="py-2 border border-indigo-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              value={quota}
              onChange={e => setQuota(e.target.value)}
            >
              <option value="General">General</option>
              <option value="Ladies">Ladies</option>
              <option value="Senior Citizens">Senior Citizens</option>
            </select>
          </div>
        </div>
        {/* Search Button */}
        <div className="col-span-4 flex justify-end mt-2 md:mt-0">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold px-8 py-3 rounded-lg shadow flex items-center gap-2 text-lg"
          >
            <Search size={22} /> Search
          </button>
        </div>
      </form>
      {loading && <div className="text-indigo-600 text-center text-lg font-semibold my-8 animate-pulse">Loading trains...</div>}
      {error && <div className="text-red-500 text-center text-lg font-semibold my-8">{error}</div>}
      <div className="flex flex-col gap-6">
        {trains.length === 0 && !loading && !error && (
          <div className="text-slate-500 text-center text-lg">No trains found for the selected route and date.</div>
        )}
        {trains.map((train) => (
          <TrainCard
            train={train}
            key={train.trainNumber}
            date={date}
            onViewSchedule={handleViewSchedule}
            quota={quota}
          />
        ))}
      </div>
      <hr className="my-10 border-t-2 border-dashed border-indigo-200" />
      {/* Trains from stations before the source */}
      <div className="mt-12">
        {beforeLoading && <div className="text-indigo-600 text-center text-lg font-semibold my-8 animate-pulse">Loading trains from stations before {source.toUpperCase()}...</div>}
        {beforeError && <div className="text-red-500 text-center text-lg font-semibold my-8">{beforeError}</div>}
        {filteredBeforeTrains.length > 0 ? (
          <>
            <h2 className="text-lg font-bold text-slate-700 mb-4 text-center">Trains from stations before {source.toUpperCase()}</h2>
            <div className="flex flex-col gap-6">
              {filteredBeforeTrains.map((train, idx) => (
                <div key={train.trainNumber + '-' + idx}>
                  <div className="text-xs text-slate-500 mb-1">
                    Searched: <span className="font-semibold">{train._fromStationCode}</span> → <span className="font-semibold">{train._toStation}</span>
                  </div>
                  <TrainCard
                    train={{
                      ...train,
                      avlClassesSorted: [
                        ...Object.entries(train.availabilityCache || {})
                          .filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'))
                          .map(([cls]) => cls),
                        ...Object.entries(train.availabilityCacheTatkal || {})
                          .filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'))
                          .map(([cls]) => cls + ' (Tatkal)')
                      ],
                      availabilityCache: Object.fromEntries(
                        Object.entries(train.availabilityCache || {}).filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'))
                      ),
                      availabilityCacheTatkal: Object.fromEntries(
                        Object.entries(train.availabilityCacheTatkal || {}).filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'))
                      ),
                      availabilityCacheForQuota: Object.fromEntries(
                        Object.entries(train.availabilityCacheForQuota || {}).filter(([cls, avl]) => avl && avl.availabilityDisplayName && avl.availabilityDisplayName !== 'REGRET' && !avl.availabilityDisplayName.includes('WL'))
                      )
                    }}
                    date={date}
                    onViewSchedule={handleViewSchedule}
                    quota={quota}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-slate-500 text-center text-lg mt-8">No available trains from other stations.</div>
        )}
      </div>
    </main>
  );
}

function SchedulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const trainNo = params.get("trainNo");
  const date = params.get("date");
  const trainName = params.get("trainName");

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trainNo || !date) return;
    setLoading(true);
    setError(null);
    setSchedule(null);
    fetch(buildScheduleUrl({ date, trainNo }))
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch schedule");
        return res.json();
      })
      .then((data) => {
        if (data.ErrorMsg) throw new Error(data.ErrorMsg);
        setSchedule(data);
      })
      .catch((err) => setError(err.message || "Failed to fetch schedule"))
      .finally(() => setLoading(false));
  }, [trainNo, date]);

  return (
    <main className="max-w-3xl mx-auto mt-8 px-2 md:px-4">
      <div className="sticky top-0 z-10 bg-white/90 py-4 mb-4 flex items-center gap-4 shadow-sm rounded-b-xl">
        <button
          onClick={() => navigate(-1)}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg shadow-sm"
        >
          ← Back
        </button>
        <h3 className="text-xl font-bold text-indigo-700 truncate">{trainName} - Route & Schedule</h3>
      </div>
      {loading && <div className="text-indigo-600 text-center my-6">Loading schedule...</div>}
      {error && <div className="text-red-500 text-center my-6">{error}</div>}
      {schedule && schedule.Schedule && (
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full border border-slate-200 rounded-lg text-xs md:text-sm shadow-lg">
            <thead className="bg-indigo-50 text-indigo-700">
              <tr>
                <th className="px-2 md:px-3 py-2 border text-center"><ArrowRight size={14}/>Stop</th>
                <th className="px-2 md:px-3 py-2 border text-center">Station</th>
                <th className="px-2 md:px-3 py-2 border text-center"><ArrowRight size={14}/>Arrival</th>
                <th className="px-2 md:px-3 py-2 border text-center"><ArrowLeft size={14}/>Departure</th>
                <th className="px-2 md:px-3 py-2 border text-center">Distance (km)</th>
                <th className="px-2 md:px-3 py-2 border text-center">Day</th>
              </tr>
            </thead>
            <tbody>
              {schedule.Schedule.map((stop, idx) => (
                <tr key={idx} className="even:bg-slate-50">
                  <td className="px-2 md:px-3 py-2 border text-center">{stop.stopNumberDisplay || idx + 1}</td>
                  <td className="px-2 md:px-3 py-2 border font-semibold whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate">{stop.StationName} <span className="text-xs text-slate-400">({stop.StationCode})</span></td>
                  <td className="px-2 md:px-3 py-2 border text-center">{stop.ArrivalTime || '-'}</td>
                  <td className="px-2 md:px-3 py-2 border text-center">{stop.DepartureTime || '-'}</td>
                  <td className="px-2 md:px-3 py-2 border text-center">{stop.Distance || '-'}</td>
                  <td className="px-2 md:px-3 py-2 border text-center">{stop.Day || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function PNRPage() {
  const [pnr, setPnr] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(pnr)) {
      setError("Please enter a valid 10-digit PNR number.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = `https://cttrainsapi.confirmtkt.com/api/v2/ctpro/mweb/${pnr}?querysource=ct-web&locale=en&getHighChanceText=true&livePnr=true`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ proPlanName: "CP1", emailId: "", tempToken: "" })
      });
      const data = await res.json();
      if (data.data && data.data.pnrResponse) {
        setResult(data.data.pnrResponse);
      } else {
        setError("No PNR data found.");
      }
    } catch (err) {
      setError("Failed to fetch PNR status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center py-8 px-2">
      <div className="w-full max-w-lg bg-white/90 rounded-3xl shadow-2xl p-8 border border-indigo-100">
        <h2 className="text-3xl font-extrabold mb-2 text-center text-indigo-700 flex items-center justify-center gap-2">
          <Ticket className="inline-block text-indigo-500" size={32} /> Check PNR Status
        </h2>
        <p className="text-center text-slate-500 mb-6">Enter your 10-digit PNR number to get the latest status and details of your train ticket.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center mb-6">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              value={pnr}
              onChange={e => setPnr(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="Enter 10-digit PNR"
              className="border-2 border-indigo-300 focus:border-indigo-500 rounded-xl px-5 py-3 w-full text-lg text-center shadow-sm transition-all focus:ring-2 focus:ring-indigo-200 bg-white"
              maxLength={10}
              required
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" size={22} />
          </div>
          <button type="submit" className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2 text-lg transition-all">
            <UserCheck size={22} /> Check Status
          </button>
        </form>
        {loading && <div className="flex flex-col items-center gap-2 text-indigo-600 text-center my-6 animate-pulse"><Loader2 className="animate-spin" size={32} />Loading...</div>}
        {error && <div className="flex items-center gap-2 text-red-500 text-center my-6"><AlertCircle size={22} />{error}</div>}
        {result && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-2xl shadow-inner p-6 mt-4 border border-indigo-200">
            <div className="flex items-center gap-3 mb-2">
              <TrainIcon className="text-indigo-500" size={28} />
              <span className="text-xl font-bold text-indigo-800">{result.trainName} <span className="text-indigo-400 font-semibold">({result.trainNo})</span></span>
            </div>
            <div className="flex flex-wrap gap-4 mb-2 text-slate-700">
              <div className="flex items-center gap-2"><CalendarIcon size={18} className="text-indigo-400" /> <span className="font-medium">DOJ:</span> {result.doj}</div>
              <div className="flex items-center gap-2"><span className="font-medium">Class:</span> {result.class}</div>
              <div className="flex items-center gap-2"><span className="font-medium">Quota:</span> {result.quota}</div>
              <div className="flex items-center gap-2"><span className="font-medium">Chart:</span> {result.chartPrepared ? <CheckCircle className="text-green-500" size={18}/> : <XCircle className="text-gray-400" size={18}/>} {result.chartPrepared ? "Prepared" : "Not Prepared"}</div>
            </div>
            <div className="flex flex-wrap gap-4 mb-2 text-slate-700">
              <div><span className="font-medium">From:</span> <span className="text-indigo-700 font-semibold">{result.from}</span> <span className="text-xs text-slate-400">({result.sourceName})</span></div>
              <div><span className="font-medium">To:</span> <span className="text-indigo-700 font-semibold">{result.to}</span> <span className="text-xs text-slate-400">({result.destinationName})</span></div>
            </div>
            <div className="flex flex-wrap gap-4 mb-2 text-slate-700">
              <div><span className="font-medium">Boarding:</span> <span className="text-indigo-700 font-semibold">{result.boardingPoint}</span> <span className="text-xs text-slate-400">({result.boardingStationName})</span></div>
              <div><span className="font-medium">Reservation Upto:</span> <span className="text-indigo-700 font-semibold">{result.reservationUpto}</span> <span className="text-xs text-slate-400">({result.reservationUptoName})</span></div>
            </div>
            <div className="flex flex-wrap gap-4 mb-2 text-slate-700">
              <div><span className="font-medium">Departure:</span> {result.departureTime}</div>
              <div><span className="font-medium">Arrival:</span> {result.arrivalTime}</div>
              <div><span className="font-medium">Duration:</span> {result.duration}</div>
              <div><span className="font-medium">Fare:</span> ₹{result.bookingFare}</div>
            </div>
            <div className="mt-4">
              <div className="font-semibold text-indigo-700 mb-2">Passenger Status</div>
              <ul className="divide-y divide-indigo-100">
                {result.passengerStatus && result.passengerStatus.map((p, i) => (
                  <li key={i} className="py-2 flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-800">Passenger {p.number}:</span>
                    <span className="text-indigo-600 font-semibold">{p.currentStatus}</span>
                    <span className="text-slate-500">({p.coach} {p.berth})</span>
                    {p.confirmTktStatus === "Confirm" ? <CheckCircle className="text-green-500" size={18}/> : <XCircle className="text-red-500" size={18}/>} 
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 pb-10">
      <header className="py-8 px-4 text-center bg-indigo-600 text-white rounded-b-3xl shadow-lg">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">🚄 ConfirmTkt Train Search</h1>
        <p className="text-lg opacity-90 font-medium">Find trains, seat availability, and predictions in seconds</p>
      </header>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/pnr" element={<PNRPage />} />
      </Routes>
      <footer className="text-center mt-12 text-slate-500 text-sm opacity-80">
        Made with <span className="text-pink-500">♥</span> for ConfirmTkt
      </footer>
    </div>
  );
}

export default App;
