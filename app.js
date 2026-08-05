    const SUPABASE_URL = 'https://djqjrgfiwlhqvchivxqe.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcWpyZ2Zpd2xocXZjaGl2eHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjAzMzUsImV4cCI6MjEwMDk5NjMzNX0.3UxQM7UWKsdImLulIKakDNDfPU73Hnt6mUyHQ7ptgNU';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const VALID_USERS = {
      "elias": { email: "elias@gymtracker.app", pass: "Elias123!", name: "Elias" },
      "anh": { email: "anh@gymtracker.app", pass: "Anh12345!", name: "Anh" },
      "denni": { email: "denni@gymtracker.app", pass: "Denni123!", name: "Denni" },
      "yoshi": { email: "yoshi@gymtracker.app", pass: "Yoshi123!", name: "Yoshi" },
      "marc": { email: "marc@gymtracker.app", pass: "Marc123!", name: "Marc" }
    };

    const DEFAULT_PLANS = {
      A: { label: "Push", exercises: [{ name: "1. KH-Schrägbankdrücken", sets: 3 }, { name: "2. Brustpresse (Maschine)", sets: 3 }, { name: "3. Cable Flys", sets: 3 }, { name: "4. Seitheben Kabelzug", sets: 3 }, { name: "5. Überkopf-Trizepsdrücken", subtitle: "Langer Kopf Stretch", sets: 3 }] },
      B: { label: "Pull", exercises: [{ name: "1. Latzug Parallelgriff", sets: 3 }, { name: "2. Rudern Maschine", sets: 3 }, { name: "3. Straight Rows Kabel", sets: 3 }, { name: "4. Face Pulls", sets: 3 }, { name: "5. Preacher Curls / Hammer", subtitle: "Stretch Fokus", sets: 3 }] },
      C: { label: "Legs", exercises: [{ name: "1. Beinbeuger sitzend", subtitle: "Vorermüdung", sets: 3 }, { name: "2. Beinpresse (Quad-Fokus)", sets: 3 }, { name: "3. Beinpresse (Breit/Hoch)", sets: 3 }, { name: "4. Beinstrecker", sets: 3 }, { name: "5. Wadenheben", sets: 3 }, { name: "6. Cable Crunches", sets: 3 }] }
    };

    const NUTRITION_FIELDS = {
      protein: { label: "Protein", unit: "g", color: "var(--accent)", fill: "linear-gradient(90deg, var(--accent), var(--green))", defaultTarget: 160 },
      kcal: { label: "Kalorien", unit: "kcal", color: "var(--orange)", fill: "linear-gradient(90deg, var(--accent), var(--orange))", defaultTarget: 2800 },
      carbs: { label: "Kohlenhydrate", unit: "g", color: "var(--blue)", fill: "linear-gradient(90deg, var(--accent), var(--blue))", defaultTarget: 350 },
      fat: { label: "Fett", unit: "g", color: "var(--red)", fill: "linear-gradient(90deg, var(--accent), var(--red))", defaultTarget: 75 },
      sugar: { label: "Zucker", unit: "g", color: "var(--purple)", fill: "linear-gradient(90deg, var(--accent), var(--purple))", defaultTarget: 50 },
      satFat: { label: "Gesättigte Fetts", unit: "g", color: "#F43F5E", fill: "linear-gradient(90deg, var(--accent), #F43F5E)", defaultTarget: 25 },
      fiber: { label: "Ballaststoffe", unit: "g", color: "#84CC16", fill: "linear-gradient(90deg, var(--accent), #84CC16)", defaultTarget: 30 },
      salt: { label: "Salz", unit: "g", color: "#06B6D4", fill: "linear-gradient(90deg, var(--accent), #06B6D4)", defaultTarget: 6 }
    };

    let selectedNutriKeys = ['protein', 'kcal'];
    let userPlans = {};
    let currentDay = 'A';
    let dbHistory = [];
    let weightHistory = [];
    let userWeight = 75;
    let targetWeight = 75;
    let nutriTargets = { protein: 150, kcal: 2800, carbs: 350, fat: 75, sugar: 50, satFat: 25, fiber: 30, salt: 6 };
    let todayNutri = { protein: 0, kcal: 0, fat: 0, satFat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 };
    let todayEntries = [];
    let selectedNutriDate;
    let openToggles = {};
    let currentUser = null;
    let myChart = null;
    let myWeightChart = null;
    let favoriteFoods = [];
    let recentFoods = [];
    let manualFoods = [];
    let nutriLogHistory = [];
    let html5QrcodeScanner = null;

    const todayStr = new Date().toISOString().split('T')[0];

    function formatDateGerman(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    async function init() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        currentUser = user;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        
        const username = user.user_metadata?.name || "User";
        document.getElementById('current-user-tag').innerText = username;
        document.getElementById('workout-date').value = todayStr;
        selectedNutriDate = todayStr;
        document.getElementById('nutri-date-picker').value = todayStr;
        
        await loadAllData();
      } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
      }
    }

    async function handleCustomLogin() {
      const usernameInput = document.getElementById('auth-user').value.trim().toLowerCase();
      const passwordInput = document.getElementById('auth-password').value.trim();

      const account = VALID_USERS[usernameInput];
      if (!account || (passwordInput !== account.pass)) {
        return alert("Ungültiger Benutzername oder falsches Passwort!");
      }

      let { data, error } = await supabaseClient.auth.signInWithPassword({
        email: account.email,
        password: account.pass
      });

      if (error) {
        let { error: signUpError } = await supabaseClient.auth.signUp({
          email: account.email,
          password: account.pass,
          options: { data: { name: account.name } }
        });

        if (signUpError) {
          return alert("Fehler beim Erstellen des Accounts in Supabase: " + signUpError.message);
        }

        let { error: retryError } = await supabaseClient.auth.signInWithPassword({
          email: account.email,
          password: account.pass
        });

        if (retryError) {
          return alert("Login nach Registrierung fehlgeschlagen: " + retryError.message);
        }
      }

      init();
    }

    async function handleLogout() {
      await supabaseClient.auth.signOut();
      location.reload();
    }

    function saveSelectedNutriKeys() {
      saveCloudFoodLists();
    }

    function renderCheckboxGrid() {
      const grid = document.getElementById('nutri-checkbox-grid');
      grid.innerHTML = '';
      Object.keys(NUTRITION_FIELDS).forEach(key => {
        const info = NUTRITION_FIELDS[key];
        const isChecked = selectedNutriKeys.includes(key);
        grid.innerHTML += `
          <label class="checkbox-label">
            <input type="checkbox" value="${key}" ${isChecked ? 'checked' : ''} onchange="toggleNutriKey('${key}')">
            <span>${info.label}</span>
          </label>
        `;
      });
      renderGoalsGrid();
    }

    function toggleNutriKey(key) {
      if (selectedNutriKeys.includes(key)) {
        if (selectedNutriKeys.length <= 1) { alert("Mindestens ein Nährwert muss ausgewählt bleiben!"); renderCheckboxGrid(); return; }
        selectedNutriKeys = selectedNutriKeys.filter(k => k !== key);
      } else {
        selectedNutriKeys.push(key);
      }
      saveSelectedNutriKeys();
      renderCheckboxGrid();
      renderNutritionUI();
    }

    function renderGoalsGrid() {
      const goalsGrid = document.getElementById('nutri-goals-grid');
      goalsGrid.innerHTML = `
        <div class="input-group">
          <span class="input-label">Zielgewicht (kg)</span>
          <input type="number" inputmode="decimal" step="0.1" id="target-weight-input" value="${targetWeight}">
        </div>
      `;
      selectedNutriKeys.forEach(key => {
        const info = NUTRITION_FIELDS[key];
        const currentTarget = nutriTargets[key] !== undefined ? nutriTargets[key] : info.defaultTarget;
        let extraNote = key === 'protein' ? ` (Auto ~${Math.round(targetWeight * 2.0)}g)` : '';
        goalsGrid.innerHTML += `
          <div class="input-group">
            <span class="input-label">Ziel: ${info.label} (${info.unit})${extraNote}</span>
            <input type="number" inputmode="numeric" id="goal_input_${key}" value="${currentTarget}" placeholder="${info.defaultTarget}">
          </div>
        `;
      });
    }

    function renderNutritionUI() {
      const container = document.getElementById('dynamic-nutrition-container');
      container.innerHTML = '';
      const dateLabel = selectedNutriDate === todayStr ? 'Heute' : formatDateGerman(selectedNutriDate);

      selectedNutriKeys.forEach(key => {
        const info = NUTRITION_FIELDS[key];
        const currentVal = todayNutri[key] || 0;
        let targetVal = nutriTargets[key] || info.defaultTarget;
        if (key === 'protein' && (!nutriTargets.protein || nutriTargets.protein === 0)) targetVal = Math.round(targetWeight * 2.0);

        let targetDisplay = targetVal > 0 ? ` / ${targetVal} ${info.unit}` : ` ${info.unit}`;
        let progressPct = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 100;
        let remText = targetVal > 0 ? (targetVal - currentVal > 0 ? `<div class="remaining-hint">Noch ${Math.round((targetVal - currentVal)*10)/10} ${info.unit} fehlen</div>` : `<div class="remaining-hint" style="color:var(--green)">Ziel erreicht! 🎉</div>`) : '';

        const keyEntries = todayEntries.filter(entry => entry.nutris && entry.nutris[key] && entry.nutris[key] > 0);
        let subEntriesHTML = '';
        if (keyEntries.length > 0) {
          let listItemsHTML = '';
          keyEntries.forEach(entry => {
            const val = entry.nutris[key];
            const realIdx = todayEntries.indexOf(entry);
            listItemsHTML += `
              <div class="search-result-item" style="padding: 8px 10px; margin-top: 4px;">
                <div style="flex:1;">
                  <div style="font-size:0.78rem; font-weight:700; color:var(--text);">${entry.name}</div>
                  <div style="font-size:0.68rem; color:var(--accent); font-weight:700;">+${val}${info.unit} ${info.label}</div>
                </div>
                <button style="background:none; border:none; color:var(--red); font-size:1rem; cursor:pointer; padding: 2px 6px;" onclick="deleteSpecificNutriEntry(${realIdx})">✕</button>
              </div>
            `;
          });
          subEntriesHTML = `
            <button class="toggle-section-btn" onclick="toggleNutriSubSection('${key}')"><span>📝 ${info.label} Einträge (${keyEntries.length})</span><span>${openToggles[key] ? '▲' : '▼'}</span></button>
            <div style="display: ${openToggles[key] ? 'block' : 'none'}; margin-top: 4px;">${listItemsHTML}</div>
          `;
        }

        container.innerHTML += `
          <div class="nutri-card-item">
            <div class="card-title" style="font-size: 0.85rem; margin-bottom: 4px;">
              <span>${info.label} Intake (${dateLabel})</span>
              <span style="color: ${info.color}; font-weight:800;">${currentVal}${targetDisplay}</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${progressPct}%; background: ${info.fill};"></div></div>
            ${remText}
            <div style="display: flex; gap: 6px; margin-bottom: 4px;">
              <input type="number" inputmode="numeric" id="input_nutri_${key}" placeholder="${info.unit} (z.B. 20)">
              <button class="btn-small" style="background:${info.color};" onclick="addSingleNutrition('${key}')">+ Hinzufügen</button>
            </div>
            ${subEntriesHTML}
          </div>
        `;
      });
      renderPet();
    }

    function toggleSettingsSection(name) {
      const sec = document.getElementById(`settings-section-${name}`);
      const icon = document.getElementById(`toggle-icon-${name}`);
      const isOpen = sec.style.display !== 'none';
      sec.style.display = isOpen ? 'none' : 'block';
      icon.innerText = isOpen ? '▼' : '▲';
    }

    function toggleNutriSubSection(key) { openToggles[key] = !openToggles[key]; renderNutritionUI(); }

    async function deleteSpecificNutriEntry(realIdx) {
      const entryToDelete = todayEntries[realIdx];
      if (!entryToDelete || !confirm(`Möchtest du "${entryToDelete.name}" löschen?`)) return;
      Object.keys(NUTRITION_FIELDS).forEach(k => { if (entryToDelete.nutris?.[k]) todayNutri[k] = Math.max(0, Math.round((todayNutri[k] - entryToDelete.nutris[k]) * 10) / 10); });
      todayEntries.splice(realIdx, 1);
      await saveTodayNutriToCloud();
      renderNutritionUI();
    }

    async function addSingleNutrition(key) {
      const input = document.getElementById(`input_nutri_${key}`);
      const val = parseFloat(input.value);
      if (!val || isNaN(val)) return;
      const addedVal = Math.round(val * 10) / 10;
      todayNutri[key] = Math.round(((todayNutri[key] || 0) + addedVal) * 10) / 10;
      todayEntries.unshift({ name: `Manuell: ${NUTRITION_FIELDS[key].label}`, nutris: { [key]: addedVal } });
      await saveTodayNutriToCloud();
      input.value = '';
      renderNutritionUI();
    }

    async function saveTodayNutriToCloud() {
      // Beim Bearbeiten eines vergangenen Tages soll das dortige Körpergewicht
      // NICHT mit dem aktuellen Gewicht überschrieben werden.
      const existingLog = (nutriLogHistory || []).find(l => l.date === selectedNutriDate);
      const weightForThisDate = selectedNutriDate === todayStr ? userWeight : (existingLog ? existingLog.weight : null);

      const payload = { 
        date: selectedNutriDate, weight: weightForThisDate, protein: todayNutri.protein, kcal: todayNutri.kcal, 
        fat: todayNutri.fat, sat_fat: todayNutri.satFat, carbs: todayNutri.carbs, sugar: todayNutri.sugar, 
        fiber: todayNutri.fiber, salt: todayNutri.salt, today_entries: todayEntries, user_id: currentUser.id 
      };
      const { error } = await supabaseClient.from('daily_logs').upsert(payload, { onConflict: 'date,user_id' });
      if (error) {
        console.error("Fehler beim Speichern des Tages-Trackings:", error.message, error);
        alert("Eintrag konnte nicht gespeichert werden: " + error.message);
      } else {
        // Lokale Historie direkt aktuell halten (ohne Reload), z.B. für die Katze und Datums-Sprünge
        nutriLogHistory = (nutriLogHistory || []).filter(l => l.date !== selectedNutriDate);
        nutriLogHistory.push(payload);
      }
    }

    // Wechselt den Bearbeitungstag im Ernährungs-Tracker (Datumsauswahl)
    function switchNutriDate() {
      selectedNutriDate = document.getElementById('nutri-date-picker').value || todayStr;
      loadNutriDataForDate();
    }

    function jumpToTodayNutri() {
      selectedNutriDate = todayStr;
      document.getElementById('nutri-date-picker').value = todayStr;
      loadNutriDataForDate();
    }

    function loadNutriDataForDate() {
      const log = (nutriLogHistory || []).find(l => l.date === selectedNutriDate);
      if (log) {
        todayNutri = { protein: log.protein || 0, kcal: log.kcal || 0, fat: log.fat || 0, satFat: log.sat_fat || 0, carbs: log.carbs || 0, sugar: log.sugar || 0, fiber: log.fiber || 0, salt: log.salt || 0 };
        todayEntries = log.today_entries || [];
      } else {
        todayNutri = { protein: 0, kcal: 0, fat: 0, satFat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 };
        todayEntries = [];
      }
      renderNutritionUI();
    }

    async function saveCloudFoodLists() {
      if (!currentUser) return;
      const { error } = await supabaseClient.from('user_goals').upsert({
        user_id: currentUser.id, target_weight: targetWeight, target_kcal: nutriTargets.kcal || 2800,
        nutri_targets: nutriTargets, favorite_foods: favoriteFoods, recent_foods: recentFoods, manual_foods: manualFoods,
        selected_nutri_keys: selectedNutriKeys
      }, { onConflict: 'user_id' });
      if (error) {
        console.error("Fehler beim Speichern der Favoriten/Recent-Liste:", error.message, error);
        alert("Favorit konnte nicht gespeichert werden: " + error.message);
      }
    }

    async function loadAllData() {
      const { data: cloudPlans } = await supabaseClient.from('user_plans').select('*').eq('user_id', currentUser.id);
      if (cloudPlans && cloudPlans.length > 0) {
        userPlans = {};
        cloudPlans.forEach(p => { userPlans[p.day_key] = { label: p.day_label, exercises: p.exercises }; });
      } else {
        userPlans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
        for (const [key, plan] of Object.entries(userPlans)) {
          await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: key, day_label: plan.label, exercises: plan.exercises }, { onConflict: 'user_id,day_key' });
        }
      }
      if (!userPlans[currentDay]) currentDay = Object.keys(userPlans)[0] || 'A';

      const { data: workouts } = await supabaseClient.from('workouts').select('*').eq('user_id', currentUser.id);
      dbHistory = (workouts || []).sort((a, b) => new Date(a.date) - new Date(b.date));

      const { data: goals, error: goalsError } = await supabaseClient.from('user_goals').select('*').eq('user_id', currentUser.id).order('id', { ascending: false });
      if (goalsError) {
        console.error("Fehler beim Laden der Goals:", goalsError.message);
      }
      if (goals && goals.length > 1) {
        console.warn(`Achtung: ${goals.length} Zeilen in user_goals für diesen User gefunden (sollte nur 1 sein). Vermutlich fehlt der UNIQUE-Constraint auf user_id in Supabase. Nehme die neueste Zeile.`);
      }
      if (goals && goals.length > 0) {
        console.log("Geladene Goals aus Supabase:", goals[0]);
        targetWeight = goals[0].target_weight || 75;
        if (goals[0].nutri_targets) nutriTargets = goals[0].nutri_targets;
        if (goals[0].favorite_foods) favoriteFoods = goals[0].favorite_foods;
        if (goals[0].recent_foods) recentFoods = goals[0].recent_foods;
        if (goals[0].manual_foods) manualFoods = goals[0].manual_foods;
        if (goals[0].selected_nutri_keys && goals[0].selected_nutri_keys.length > 0) selectedNutriKeys = goals[0].selected_nutri_keys;
      } else {
        console.log("Keine Goals in Supabase für diesen User gefunden.");
      }

      const { data: logs, error: logsError } = await supabaseClient.from('daily_logs').select('*').eq('user_id', currentUser.id);
      if (logsError) {
        console.error("Fehler beim Laden der Tages-Logs:", logsError.message, logsError);
      }
      if (logs && logs.length > 0) {
        nutriLogHistory = logs;
        weightHistory = logs.filter(l => l.weight > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (weightHistory.length > 0) { userWeight = weightHistory[weightHistory.length - 1].weight; document.getElementById('latest-weight-display').innerText = `${userWeight} kg`; }
        const matchingLogs = logs.filter(l => l.date === selectedNutriDate);
        if (matchingLogs.length > 1) {
          console.warn(`Achtung: ${matchingLogs.length} Zeilen in daily_logs für ${selectedNutriDate} gefunden (sollte nur 1 sein). Vermutlich fehlt der UNIQUE-Constraint auf (date,user_id). Nehme die letzte.`);
        }
        const selectedLog = matchingLogs[matchingLogs.length - 1];
        if (selectedLog) {
          todayNutri = { protein: selectedLog.protein || 0, kcal: selectedLog.kcal || 0, fat: selectedLog.fat || 0, satFat: selectedLog.sat_fat || 0, carbs: selectedLog.carbs || 0, sugar: selectedLog.sugar || 0, fiber: selectedLog.fiber || 0, salt: selectedLog.salt || 0 };
          todayEntries = selectedLog.today_entries || [];
        } else {
          todayNutri = { protein: 0, kcal: 0, fat: 0, satFat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 };
          todayEntries = [];
        }
      }

      document.getElementById('user-weight').value = userWeight;
      renderDaySelector();
      switchDay(currentDay);
      renderCheckboxGrid();
      renderNutritionUI();
      renderFavoritesUI();   // <-- Direkt nach dem Laden gerendert!
      renderRecentUI();      // <-- Direkt nach dem Laden gerendert!
      renderManualFoodUI();
      renderWeightChart();
      renderWeekStrip();
    }

    function switchMainTab(tab) {
      document.getElementById('view-workout').style.display = (tab === 'WORKOUT') ? 'block' : 'none';
      document.getElementById('view-dashboard').style.display = (tab === 'DASHBOARD') ? 'block' : 'none';
      document.getElementById('view-pet').style.display = (tab === 'PET') ? 'block' : 'none';
      document.getElementById('tab-btn-workout').classList.toggle('active', tab === 'WORKOUT');
      document.getElementById('tab-btn-dash').classList.toggle('active', tab === 'DASHBOARD');
      document.getElementById('tab-btn-pet').classList.toggle('active', tab === 'PET');
      if (tab === 'DASHBOARD') renderWeightChart();
      if (tab === 'PET') renderPet();
    }

    function renderDaySelector() {
      const container = document.getElementById('day-selector-list');
      container.innerHTML = '';
      Object.keys(userPlans).forEach(key => {
        container.innerHTML += `<button class="day-btn ${key === currentDay ? 'active' : ''}" onclick="switchDay('${key}')">${userPlans[key].label}</button>`;
      });
      container.innerHTML += `<button class="day-btn day-btn-add" onclick="addNewDay()">+ Tag</button>`;
    }

    async function addNewDay() {
      const label = prompt("Plan Name:", "Arme");
      if (!label) return;
      const key = 'DAY_' + Date.now();
      userPlans[key] = { label, exercises: [] };
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: key, day_label: label, exercises: [] }, { onConflict: 'user_id,day_key' });
      switchDay(key);
    }

    async function deleteCurrentDay() {
      if (Object.keys(userPlans).length <= 1 || !confirm("Plan wirklich löschen?")) return;
      await supabaseClient.from('user_plans').delete().eq('user_id', currentUser.id).eq('day_key', currentDay);
      delete userPlans[currentDay];
      switchDay(Object.keys(userPlans)[0]);
    }

    function switchDay(day) { currentDay = day; renderDaySelector(); renderWorkout(); populateExercisePicker(); renderChart(); }

    function renderWorkout() {
      const container = document.getElementById('workout-container');
      container.innerHTML = '';
      const selectedDate = document.getElementById('workout-date').value || todayStr;
      const plan = userPlans[currentDay];
      if (!plan || !plan.exercises || plan.exercises.length === 0) { container.innerHTML = `<div style="text-align:center; color:var(--sub); padding:20px;">Keine Übungen.</div>`; return; }

      plan.exercises.forEach((ex, exIdx) => {
        let setsHTML = '';
        for (let s = 0; s < ex.sets; s++) {
          const exact = dbHistory.find(h => h.date === selectedDate && h.day_type === currentDay && h.exercise_name === ex.name && h.set_number === (s + 1));
          const last = dbHistory.filter(h => h.exercise_name === ex.name && h.set_number === (s + 1) && h.date < selectedDate).pop();
          setsHTML += `
            <div class="set-container">
              <div class="set-row">
                <div style="font-size:0.8rem; color:var(--sub);">Satz ${s + 1}</div>
                <input type="number" inputmode="decimal" step="0.5" placeholder="kg" id="w_${exIdx}_${s}" value="${exact ? exact.weight : ''}">
                <input type="number" inputmode="numeric" placeholder="Wdh" id="r_${exIdx}_${s}" value="${exact ? exact.reps : ''}">
              </div>
              <div class="last-val-hint">${last ? `Zuletzt: ${last.weight}kg × ${last.reps}` : 'Zuletzt: Kein Eintrag'}</div>
            </div>`;
        }
        container.innerHTML += `
          <div class="exercise-card">
            <div class="action-btn-group">
              <button class="ex-action-btn remove-set" onclick="removeSingleSet(${exIdx})">➖</button>
              <button class="ex-action-btn add-set" onclick="addSingleSet(${exIdx})">➕</button>
              <button class="ex-action-btn" onclick="editExercise(${exIdx})">✏️</button>
              <button class="ex-action-btn delete" onclick="removeExercise(${exIdx})">✕</button>
            </div>
            <div class="exercise-title"><span>${ex.name}</span> ${ex.subtitle ? `<span class="exercise-subtitle">(${ex.subtitle})</span>` : ''}</div>
            ${setsHTML}
          </div>`;
      });
    }

    async function addExerciseToCurrentDay() {
      const name = document.getElementById('new-ex-name').value.trim();
      const sub = document.getElementById('new-ex-sub').value.trim();
      const sets = parseInt(document.getElementById('new-ex-sets').value) || 3;
      if (!name) return alert("Name eingeben!");
      userPlans[currentDay].exercises.push({ name, subtitle: sub || undefined, sets });
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: currentDay, day_label: userPlans[currentDay].label, exercises: userPlans[currentDay].exercises }, { onConflict: 'user_id,day_key' });
      document.getElementById('new-ex-name').value = ''; document.getElementById('new-ex-sub').value = '';
      renderWorkout(); populateExercisePicker(); renderChart();
    }

    async function addSingleSet(exIdx) {
      if (userPlans[currentDay].exercises[exIdx].sets >= 10) return;
      userPlans[currentDay].exercises[exIdx].sets++;
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: currentDay, day_label: userPlans[currentDay].label, exercises: userPlans[currentDay].exercises }, { onConflict: 'user_id,day_key' });
      renderWorkout();
    }

    async function removeSingleSet(exIdx) {
      if (userPlans[currentDay].exercises[exIdx].sets <= 1) return;
      userPlans[currentDay].exercises[exIdx].sets--;
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: currentDay, day_label: userPlans[currentDay].label, exercises: userPlans[currentDay].exercises }, { onConflict: 'user_id,day_key' });
      renderWorkout();
    }

    async function editExercise(exIdx) {
      const ex = userPlans[currentDay].exercises[exIdx];
      const newName = prompt("Neuer Name:", ex.name);
      if (newName === null) return;
      const newSub = prompt("Untertitel:", ex.subtitle || "");
      if (newName.trim()) {
        await supabaseClient.from('workouts').update({ exercise_name: newName.trim() }).eq('user_id', currentUser.id).eq('exercise_name', ex.name);
        ex.name = newName.trim();
      }
      if (newSub.trim()) ex.subtitle = newSub.trim(); else delete ex.subtitle;
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: currentDay, day_label: userPlans[currentDay].label, exercises: userPlans[currentDay].exercises }, { onConflict: 'user_id,day_key' });
      loadAllData();
    }

    async function removeExercise(exIdx) {
      if (!confirm("Entfernen?")) return;
      userPlans[currentDay].exercises.splice(exIdx, 1);
      await supabaseClient.from('user_plans').upsert({ user_id: currentUser.id, day_key: currentDay, day_label: userPlans[currentDay].label, exercises: userPlans[currentDay].exercises }, { onConflict: 'user_id,day_key' });
      renderWorkout(); populateExercisePicker(); renderChart();
    }

    function populateExercisePicker() {
      const picker = document.getElementById('exercise-picker');
      picker.innerHTML = '';
      userPlans[currentDay]?.exercises?.forEach(ex => { picker.innerHTML += `<option value="${ex.name}">${ex.name}</option>`; });
    }

    function handleModeChange() {
      document.getElementById('exercise-picker').style.display = (document.getElementById('view-mode').value === 'EXERCISE') ? 'block' : 'none';
      renderChart();
    }

    function renderChart() {
      const mode = document.getElementById('view-mode').value;
      const selectedEx = document.getElementById('exercise-picker').value;
      const filtered = dbHistory.filter(h => h.day_type === currentDay);
      const dates = [...new Set(filtered.map(h => h.date))].sort((a,b) => new Date(a) - new Date(b));
      let points = dates.map(d => {
        let vol = 0;
        filtered.filter(h => h.date === d).forEach(l => { if (mode === "PLAN" || l.exercise_name === selectedEx) vol += (l.weight * l.reps); });
        return vol;
      });

      if (points.length >= 2 && points[points.length - 2] > 0) {
        const growth = ((points[points.length - 1] - points[points.length - 2]) / points[points.length - 2]) * 100;
        document.getElementById('growth-val').innerText = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
      } else {
        document.getElementById('growth-val').innerText = '+0.0%';
      }

      if (myChart) myChart.destroy();
      myChart = new Chart(document.getElementById('progressChart').getContext('2d'), {
        type: 'line',
        data: { labels: dates.map(formatDateGerman), datasets: [{ data: points.length ? points : [0], borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.12)', fill: true, tension: 0.35 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      renderHistoryChips(dates);
    }

    function renderHistoryChips(dates) {
      const container = document.getElementById('history-manage-container');
      const list = document.getElementById('history-chip-list');
      list.innerHTML = '';
      if (!dates.length) { container.style.display = 'none'; return; }
      container.style.display = 'block';
      dates.forEach(d => { list.innerHTML += `<div class="history-chip"><span>${formatDateGerman(d)}</span><button onclick="deleteWorkoutDate('${d}')">✕</button></div>`; });
    }

    async function deleteWorkoutDate(date) {
      if (!confirm("Tag löschen?")) return;
      await supabaseClient.from('workouts').delete().eq('user_id', currentUser.id).eq('day_type', currentDay).eq('date', date);
      loadAllData();
    }

    async function saveData() {
      const date = document.getElementById('workout-date').value || todayStr;
      let entries = [];
      let exNames = new Set();
      userPlans[currentDay].exercises.forEach((ex, exIdx) => {
        let has = false;
        for (let s = 0; s < ex.sets; s++) {
          const w = parseFloat(document.getElementById(`w_${exIdx}_${s}`)?.value) || 0;
          const r = parseInt(document.getElementById(`r_${exIdx}_${s}`)?.value) || 0;
          if (w > 0 || r > 0) { has = true; entries.push({ date, day_type: currentDay, exercise_name: ex.name, set_number: s + 1, weight: w, reps: r, user_id: currentUser.id }); }
        }
        if (has) exNames.add(ex.name);
      });
      if (!entries.length) return alert("Mindestens ein Feld ausfüllen!");
      for (let name of exNames) { await supabaseClient.from('workouts').delete().eq('date', date).eq('day_type', currentDay).eq('exercise_name', name).eq('user_id', currentUser.id); }
      await supabaseClient.from('workouts').insert(entries);
      alert("Gespeichert!");
      loadAllData();
    }

    async function saveGoals() {
      targetWeight = parseFloat(document.getElementById('target-weight-input').value) || 75;
      selectedNutriKeys.forEach(key => { const val = parseFloat(document.getElementById(`goal_input_${key}`)?.value); if (!isNaN(val)) nutriTargets[key] = val; });
      await supabaseClient.from('user_goals').upsert({ user_id: currentUser.id, target_weight: targetWeight, target_kcal: nutriTargets.kcal || 2800, nutri_targets: nutriTargets, favorite_foods: favoriteFoods, recent_foods: recentFoods }, { onConflict: 'user_id' });
      renderNutritionUI();
      alert("Ziele gespeichert!");
    }

    function renderWeightChart() {
      if (myWeightChart) myWeightChart.destroy();
      myWeightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
        type: 'line',
        data: { labels: weightHistory.map(w => formatDateGerman(w.date)), datasets: [{ data: weightHistory.map(w => w.weight).length ? weightHistory.map(w => w.weight) : [userWeight], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', fill: true, tension: 0.35 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    // Berechnet einen "Fütterungs-Score" (5-95) aus dem Schnitt der letzten Tage
    // im Vergleich zum Kalorienziel. 50 = im Ziel, darunter = zu wenig, darüber = zu viel.
    function getPetFatnessScore() {
      const target = nutriTargets.kcal || 2800;
      let entries = (nutriLogHistory || [])
        .filter(l => l.kcal > 0)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7)
        .map(l => l.kcal);
      if (!entries.length) return 50; // Noch keine Daten -> neutrale Katze
      const avgKcal = entries.reduce((a, b) => a + b, 0) / entries.length;
      const ratio = avgKcal / target;
      return Math.max(5, Math.min(95, Math.round(ratio * 50)));
    }

    function renderPet() {
      const petBody = document.getElementById('pet-body');
      if (!petBody) return; // Tab evtl. noch nicht im DOM

      const score = getPetFatnessScore();
      const rx = 26 + (score / 100) * 42; // 26 (dünn) .. 68 (dick)
      const ry = 34 + (score / 100) * 18; // 34 (dünn) .. 52 (dick)

      petBody.setAttribute('rx', rx);
      petBody.setAttribute('ry', ry);
      document.getElementById('pet-shadow').setAttribute('rx', rx * 1.25);
      document.getElementById('pet-paw-l').setAttribute('cx', 100 - rx * 0.62);
      document.getElementById('pet-paw-r').setAttribute('cx', 100 + rx * 0.62);

      let statusText, mouthPath;
      if (score < 20) { statusText = "🥺 Deine Katze hungert! Bitte füttere sie mehr."; mouthPath = "M 90 100 Q 100 90 110 100"; }
      else if (score < 40) { statusText = "😿 Etwas hager – ein bisschen mehr füttern wäre gut."; mouthPath = "M 92 98 Q 100 94 108 98"; }
      else if (score < 65) { statusText = "😻 Kerngesund und rundum zufrieden!"; mouthPath = "M 92 96 Q 100 102 108 96"; }
      else if (score < 85) { statusText = "😸 Schön rundlich und gemütlich."; mouthPath = "M 90 96 Q 100 104 110 96"; }
      else { statusText = "🙀 Der Napf ist ständig leer... etwas kürzertreten?"; mouthPath = "M 88 97 Q 100 105 112 97"; }

      document.getElementById('pet-mouth').setAttribute('d', mouthPath);
      document.getElementById('pet-status-text').innerText = statusText;

      const target = nutriTargets.kcal || 2800;
      const todayLog = (nutriLogHistory || []).find(l => l.date === todayStr);
      const todayKcal = todayLog ? (todayLog.kcal || 0) : 0;
      document.getElementById('pet-kcal-hint').innerText = todayKcal > 0
        ? `Heute gefüttert: ${Math.round(todayKcal)} / ${target} kcal`
        : `Noch nichts gefüttert heute (Ziel: ${target} kcal)`;
    }

    function renderWeekStrip() {
      const strip = document.getElementById('week-strip');
      if (!strip) return;
      strip.innerHTML = '';
      
      const now = new Date();
      // Montag der aktuellen Woche finden
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const monday = new Date(now); 
      monday.setDate(now.getDate() - dayOfWeek);
      
      const days = ['Mo','Di','Mi','Do','Fr','Sa','So'];
      days.forEach((d, i) => {
        const dt = new Date(monday); 
        dt.setDate(monday.getDate() + i);
        
        // Lokales Datum sicher zusammenbauen (YYYY-MM-DD)
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const dtStr = `${year}-${month}-${day}`;
        
        const isToday = dtStr === todayStr;
        
        // Prüfen, ob an diesem Tag trainiert wurde (für den Indikator)
        const hasWorkout = dbHistory.some(h => h.date === dtStr);
        const dotHTML = hasWorkout ? '<div style="width:6px;height:6px;background:var(--green);border-radius:50%;margin:4px auto 0;"></div>' : '';

        strip.innerHTML += `
          <div class="day-pill ${isToday ? 'today' : ''}">
            <div class="day-name">${d}</div>
            <div>${dt.getDate()}</div>
            ${dotHTML}
          </div>
        `;
      });
}

    async function saveWeight() {
      const val = parseFloat(document.getElementById('user-weight').value);
      if (!val) return;
      userWeight = val;
      // Unabhängig vom gerade im Ernährungs-Tab ausgewählten Datum: Gewicht gehört immer zu HEUTE.
      const existing = (nutriLogHistory || []).find(l => l.date === todayStr) || {};
      const payload = {
        date: todayStr, weight: userWeight,
        protein: existing.protein || 0, kcal: existing.kcal || 0, fat: existing.fat || 0, sat_fat: existing.sat_fat || 0,
        carbs: existing.carbs || 0, sugar: existing.sugar || 0, fiber: existing.fiber || 0, salt: existing.salt || 0,
        today_entries: existing.today_entries || [], user_id: currentUser.id
      };
      const { error } = await supabaseClient.from('daily_logs').upsert(payload, { onConflict: 'date,user_id' });
      if (error) {
        console.error("Fehler beim Speichern des Gewichts:", error.message, error);
        alert("Gewicht konnte nicht gespeichert werden: " + error.message);
        return;
      }
      nutriLogHistory = (nutriLogHistory || []).filter(l => l.date !== todayStr);
      nutriLogHistory.push(payload);
      loadAllData();
      alert("Gewicht gesichert!");
    }

    function startBarcodeScanner() {
      document.getElementById('scanner-overlay').style.display = 'block';
      html5QrcodeScanner = new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        verbose: false
      });
      html5QrcodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const w = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.9);
            return { width: w, height: Math.floor(w * 0.45) };
          },
          aspectRatio: 1.777778,
          disableFlip: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        onScanSuccess
      ).catch(() => { alert("Kamera-Fehler!"); stopBarcodeScanner(); });
    }
    async function stopBarcodeScanner() { if (html5QrcodeScanner) { try { await html5QrcodeScanner.stop(); } catch(e) {} html5QrcodeScanner = null; } document.getElementById('scanner-overlay').style.display = 'none'; }
    async function onScanSuccess(text) { await stopBarcodeScanner(); const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${text}.json`); const data = await res.json(); if (data.status === 1) processAndAddProduct(data.product); else alert("Produkt nicht gefunden."); }

    function createFoodCard(foodObj) {
      const name = foodObj.name || "Produkt";
      const nutris = foodObj.nutris || { protein: 0, kcal: 0, carbs: 0, fat: 0 };
      const isFav = favoriteFoods.some(f => f.name === name);

      const item = document.createElement('div');
      item.className = 'search-result-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'food-info-clickable';
      infoDiv.innerHTML = `
        <div style="font-size:0.8rem; font-weight:700; color:var(--text);">${name}</div>
        <div style="font-size:0.7rem; color:var(--sub);">${nutris.protein}g P | ${nutris.kcal} kcal | ${nutris.carbs}g KH | ${nutris.fat}g Fett</div>
      `;
      infoDiv.onclick = () => processAndAddProductDirect(foodObj);

      const favBtn = document.createElement('button');
      favBtn.className = 'item-fav-btn';
      favBtn.innerText = isFav ? '⭐️' : '☆';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(foodObj);
      };

      item.appendChild(infoDiv);
      item.appendChild(favBtn);
      return item;
    }

    function createFoodCardFromApi(p) {
      const name = (p.brands ? p.brands + " - " : "") + (p.product_name || "Produkt");
      const foodObj = { 
        name, 
        nutris: extractNutris(p), 
        categories: (p.categories_tags || []).join(' '), 
        quantity: p.quantity || "", 
        code: p.code || "" 
      };
      return createFoodCard(foodObj);
    }

    async function toggleFavorite(foodObj) {
      const idx = favoriteFoods.findIndex(f => f.name === foodObj.name);
      if (idx >= 0) favoriteFoods.splice(idx, 1); 
      else favoriteFoods.push(foodObj);

      await saveCloudFoodLists();
      renderFavoritesUI();
      renderRecentUI();
      renderManualFoodUI();

      const query = document.getElementById('food-search-query').value.trim();
      if (query) searchFoodByName();
    }

    function renderFavoritesUI() {
      const sec = document.getElementById('favorites-section'); 
      const list = document.getElementById('favorites-list');
      list.innerHTML = ''; 
      if (!favoriteFoods.length) { sec.style.display = 'none'; return; }
      sec.style.display = 'block'; 
      favoriteFoods.forEach(f => list.appendChild(createFoodCard(f)));
    }

    async function addToRecent(fObj) {
      recentFoods = recentFoods.filter(r => r.name !== fObj.name);
      recentFoods.unshift(fObj); 
      if (recentFoods.length > 5) recentFoods.pop();
      await saveCloudFoodLists();
      renderRecentUI();
    }

    function renderRecentUI() {
      const sec = document.getElementById('recent-food-section'); 
      const list = document.getElementById('recent-food-list');
      list.innerHTML = ''; 
      if (!recentFoods.length) { sec.style.display = 'none'; return; }
      sec.style.display = 'block'; 
      recentFoods.forEach(f => list.appendChild(createFoodCard(f)));
    }

    async function addManualFood() {
      const nameInput = document.getElementById('manual-food-name');
      const name = nameInput.value.trim();
      if (!name) return alert("Bitte einen Namen eingeben!");

      const protein = parseFloat(document.getElementById('manual-food-protein').value) || 0;
      const kcal = parseFloat(document.getElementById('manual-food-kcal').value) || 0;
      const carbs = parseFloat(document.getElementById('manual-food-carbs').value) || 0;
      const fat = parseFloat(document.getElementById('manual-food-fat').value) || 0;

      const foodObj = {
        name,
        nutris: { protein, kcal, carbs, fat, satFat: 0, sugar: 0, fiber: 0, salt: 0 },
        categories: '', quantity: '', code: ''
      };

      manualFoods = manualFoods.filter(f => f.name !== name);
      manualFoods.unshift(foodObj);

      await saveCloudFoodLists();
      renderManualFoodUI();

      nameInput.value = '';
      document.getElementById('manual-food-protein').value = '';
      document.getElementById('manual-food-kcal').value = '';
      document.getElementById('manual-food-carbs').value = '';
      document.getElementById('manual-food-fat').value = '';
    }

    function renderManualFoodUI() {
      const sec = document.getElementById('manual-food-section');
      const list = document.getElementById('manual-food-list');
      list.innerHTML = '';
      if (!manualFoods.length) { sec.style.display = 'none'; return; }
      sec.style.display = 'block';
      manualFoods.forEach(f => list.appendChild(createFoodCard(f)));
    }

    function extractNutris(p) {
      const n = p.nutriments || {};
      return { 
        protein: Math.round((n.proteins_100g || 0)*10)/10, 
        kcal: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0), 
        fat: Math.round((n.fat_100g || 0)*10)/10, 
        satFat: Math.round((n['saturated-fat_100g'] || 0)*10)/10, 
        carbs: Math.round((n.carbohydrates_100g || 0)*10)/10, 
        sugar: Math.round((n.sugars_100g || 0)*10)/10, 
        fiber: Math.round((n.fiber_100g || 0)*10)/10, 
        salt: Math.round((n.salt_100g || 0)*10)/10 
      };
    }

    function processAndAddProduct(p) {
      processAndAddProductDirect({ 
        name: (p.brands ? p.brands + " - " : "") + (p.product_name || "Produkt"), 
        nutris: extractNutris(p), 
        categories: (p.categories_tags || []).join(' '), 
        quantity: p.quantity || "", 
        code: p.code || "" 
      });
    }

    async function processAndAddProductDirect(foodObj) {
      const amountStr = prompt(`Menge für ${foodObj.name} eingeben (in g oder ml):`, "100");
      const amount = parseFloat(amountStr);
      if (!amount || isNaN(amount)) return;

      const added = {};
      Object.keys(NUTRITION_FIELDS).forEach(k => {
        const val = Math.round((((foodObj.nutris[k] || 0) * amount) / 100) * 10) / 10;
        if (val > 0) added[k] = val;
        todayNutri[k] = Math.round(((todayNutri[k] || 0) + val) * 10) / 10;
      });

      todayEntries.unshift({ name: `${foodObj.name} (${amount}g/ml)`, nutris: added });
      await saveTodayNutriToCloud();
      await addToRecent(foodObj);
      renderNutritionUI();
      alert("Hinzugefügt!");
    }

    async function searchFoodByName() {
      const q = document.getElementById('food-search-query').value.trim();
      const container = document.getElementById('food-search-results');
      if (!q) return;
      
      container.innerHTML = `<div style="font-size:0.75rem; color:var(--sub); text-align:center;">Suche...</div>`;
      
      try {
        // FIX 1: "de." statt "world." für bessere DACH-Ergebnisse und page_size auf 15 erhöht
        const res = await fetch(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15`);
        const data = await res.json();
        container.innerHTML = '';
        
        if (data.products && data.products.length > 0) {
          // FIX 2: Sortiere kaputte Einträge ohne Produktnamen aus
          const validProducts = data.products.filter(p => p.product_name && p.product_name.trim() !== "");
          
          if (validProducts.length > 0) {
            // Zeige die besten 8 Ergebnisse an
            validProducts.slice(0, 8).forEach(p => container.appendChild(createFoodCardFromApi(p)));
          } else {
            container.innerHTML = `<div style="font-size:0.75rem; color:var(--sub); text-align:center; padding: 6px;">Keine gültigen Produkte gefunden.</div>`;
          }
        } else {
          container.innerHTML = `<div style="font-size:0.75rem; color:var(--sub); text-align:center; padding: 6px;">Keine Produkte gefunden.</div>`;
        }
      } catch(e) {
        container.innerHTML = `<div style="font-size:0.75rem; color:var(--red); text-align:center; padding: 6px;">Fehler bei der Suche.</div>`;
      }
    }

    async function syncCloudData() {
      document.body.style.opacity = '0.5';
      await loadAllData();
      document.body.style.opacity = '1';
    }

    // Automatisch synchronisieren, wenn die App in den Vordergrund rückt
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && currentUser) {
        loadAllData();
      }
    });
    window.onload = init;
