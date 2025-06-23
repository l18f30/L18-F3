function generateMonthlyReport() {
    const year = document.getElementById('reportYear').value;
    const month = document.getElementById('reportMonth').value;
    const unit = document.getElementById('reportUnit').value;
    
    // Update active filters display
    updateActiveFilters({
        year: year,
        month: month,
        unit: unit === 'همه' ? '' : unit
    });
    
    // Update the date range display
    const monthNamesList = ['', 'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
    document.getElementById('selectedYear').textContent = year;
    document.getElementById('selectedMonth').textContent = monthNamesList[parseInt(month)] || month;
    
    // Show loading state
    const reportTbody = document.getElementById('monthlyReportTableBody');
    if (reportTbody) {
        reportTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">لە هەوڵی بەدەستهێنانی زانیارییەکان... <i class="fas fa-spinner fa-spin"></i></td></tr>';
    }
    
    // Update summary cards with loading state
    document.getElementById('totalSoldiersCount').textContent = '...';
    document.getElementById('totalAbsencesCount').textContent = '...';
    document.getElementById('totalLeavesCount').textContent = '...';
    document.getElementById('avgAbsenceRate').textContent = '...%';
    
    // Get all records from localStorage
    let allRecords = [];
    try {
        allRecords = JSON.parse(localStorage.getItem('militaryRecords')) || [];
        console.log('Total records loaded:', allRecords.length);
    } catch (e) {
        console.error('Error parsing records:', e);
        allRecords = [];
    }
    
    // Filter records for the selected month and year
    const selectedMonth = month.padStart(2, '0');
    const filteredRecords = allRecords.filter(record => {
        try {
            if (!record || !record.dataDate) return false;
            
            // Parse the date (format: YYYY-MM-DD or YYYY/MM/DD)
            let recordDateStr = record.dataDate.split(' ')[0]; // In case there's time part
            recordDateStr = recordDateStr.replace(/\//g, '-'); // Convert slashes to dashes
            
            const [yearPart, monthPart] = recordDateStr.split('-');
            
            // Check if the record matches the selected year and month
            return yearPart === year && 
                   monthPart === selectedMonth &&
                   (unit === 'همه' || !unit || record.unit === unit);
        } catch (e) {
            console.error('Error processing record:', record, e);
            return false;
        }
    });
    
    console.log(`Filtered records for ${year}-${selectedMonth}:`, filteredRecords);
    
    // Group records by soldier with detailed dates
    const soldiersData = {};
    
    filteredRecords.forEach(record => {
        if (!record.name) return;
        
        const recordDate = record.dataDate ? record.dataDate.split(' ')[0] : new Date().toISOString().split('T')[0];
        
        if (!soldiersData[record.name]) {
            soldiersData[record.name] = {
                name: record.name,
                rank: record.rank || 'نەناسراو',
                unit: record.unit || 'نەناسراو',
                absences: 0,
                leaves: 0,
                absenceDates: [],
                leaveDates: [],
                notes: []
            };
        }
        
        if (record.type === 'absence') {
            soldiersData[record.name].absences++;
            if (!soldiersData[record.name].absenceDates.includes(recordDate)) {
                soldiersData[record.name].absenceDates.push(recordDate);
            }
        } else if (record.type === 'leave') {
            soldiersData[record.name].leaves++;
            if (!soldiersData[record.name].leaveDates.includes(recordDate)) {
                soldiersData[record.name].leaveDates.push(recordDate);
            }
        }
        
        if (record.notes && !soldiersData[record.name].notes.includes(record.notes)) {
            soldiersData[record.name].notes.push(record.notes);
        }
        
        // Sort dates in ascending order
        if (soldiersData[record.name].absenceDates) {
            soldiersData[record.name].absenceDates.sort((a, b) => new Date(a) - new Date(b));
        }
        if (soldiersData[record.name].leaveDates) {
            soldiersData[record.name].leaveDates.sort((a, b) => new Date(a) - new Date(b));
        }
    });
    
    // Convert to array and filter by unit if specified
    let filteredData = Object.values(soldiersData);
    
    if (unit && unit !== 'همه') {
        filteredData = filteredData.filter(soldier => soldier.unit === unit);
    }
    
    // Rest of the function remains the same...
    console.log(`Processed data for ${filteredData.length} soldiers:`, filteredData);
    
    // Calculate totals
    const totalSoldiers = filteredData.length;
    const totalAbsences = filteredData.reduce((sum, item) => sum + item.absences, 0);
    const totalLeaves = filteredData.reduce((sum, item) => sum + item.leaves, 0);
    const totalDaysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const avgAbsenceRate = totalSoldiers > 0 ? 
        Math.round((totalAbsences / (totalSoldiers * totalDaysInMonth)) * 100) : 0;
    
    // Update summary cards
    document.getElementById('totalSoldiersCount').textContent = totalSoldiers;
    document.getElementById('totalAbsencesCount').textContent = totalAbsences;
    document.getElementById('totalLeavesCount').textContent = totalLeaves;
    document.getElementById('avgAbsenceRate').textContent = `${avgAbsenceRate}%`;
    
    // Clear existing table
    const tableBody = document.getElementById('monthlyReportTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        // Add rows for each soldier
        filteredData.forEach(soldier => {
            addSoldierRow(soldier, totalDaysInMonth);
        });
    }
    
    // Update the report summary
    updateReportSummary(year, month, totalSoldiers, totalAbsences, totalLeaves, avgAbsenceRate, unit);
}
