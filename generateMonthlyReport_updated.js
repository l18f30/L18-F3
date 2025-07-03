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
                absenceReturnDates: [],
                leaveReturnDates: [],
                notes: []
            };
        }
        
        if (record.type === 'absence') {
            soldiersData[record.name].absences++;
            if (!soldiersData[record.name].absenceDates.includes(recordDate)) {
                soldiersData[record.name].absenceDates.push(recordDate);
                // Store return date for absence (next day by default, or from record if available)
                const returnDate = record.returnDate || new Date(new Date(recordDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                soldiersData[record.name].absenceReturnDates.push(returnDate);
            }
        } else if (record.type === 'leave') {
            soldiersData[record.name].leaves++;
            if (!soldiersData[record.name].leaveDates.includes(recordDate)) {
                soldiersData[record.name].leaveDates.push(recordDate);
                // Store return date for leave (next day by default, or from record if available)
                const returnDate = record.returnDate || new Date(new Date(recordDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                soldiersData[record.name].leaveReturnDates.push(returnDate);
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
    const tableHeader = document.getElementById('monthlyReportTableHeader');
    
    // Update table header
    if (tableHeader) {
        tableHeader.innerHTML = `
            <tr>
                <th>ناو</th>
                <th>پلە</th>
                <th>یەکە</th>
                <th>ژمارەی غیابەکان</th>
                <th>کاتی غیاب</th>
                <th>ژمارەی مۆڵەتەکان</th>
                <th>کاتی مۆڵەت</th>
                <th>تێبینییەکان</th>
            </tr>
        `;
    }
    
    if (tableBody) {
        tableBody.innerHTML = '';
        
        // Add rows for each soldier
        filteredData.forEach(soldier => {
            const row = document.createElement('tr');
            
            // Format dates for display
            const formatDateForDisplay = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
            };
            
            // Format date ranges for absences
            let absenceRanges = [];
            if (soldier.absenceDates && soldier.absenceDates.length > 0) {
                for (let i = 0; i < soldier.absenceDates.length; i++) {
                    const startDate = soldier.absenceDates[i];
                    const endDate = soldier.absenceReturnDates && soldier.absenceReturnDates[i] 
                        ? soldier.absenceReturnDates[i] 
                        : startDate;
                    
                    const formattedStart = formatDateForDisplay(startDate);
                    const formattedEnd = endDate ? formatDateForDisplay(endDate) : '';
                    
                    if (formattedStart === formattedEnd || !formattedEnd) {
                        absenceRanges.push(`<div>${formattedStart}</div>`);
                    } else {
                        absenceRanges.push(`<div>${formattedStart} - ${formattedEnd}</div>`);
                    }
                }
            }
            
            // Format date ranges for leaves
            let leaveRanges = [];
            if (soldier.leaveDates && soldier.leaveDates.length > 0) {
                for (let i = 0; i < soldier.leaveDates.length; i++) {
                    const startDate = soldier.leaveDates[i];
                    const endDate = soldier.leaveReturnDates && soldier.leaveReturnDates[i] 
                        ? soldier.leaveReturnDates[i] 
                        : startDate;
                    
                    const formattedStart = formatDateForDisplay(startDate);
                    const formattedEnd = endDate ? formatDateForDisplay(endDate) : '';
                    
                    if (formattedStart === formattedEnd || !formattedEnd) {
                        leaveRanges.push(`<div>${formattedStart}</div>`);
                    } else {
                        leaveRanges.push(`<div>${formattedStart} - ${formattedEnd}</div>`);
                    }
                }
            }
            
            // Get the earliest and latest dates for absences and leaves
            const allAbsenceDates = [...(soldier.absenceDates || []), ...(soldier.absenceReturnDates || [])];
            const allLeaveDates = [...(soldier.leaveDates || []), ...(soldier.leaveReturnDates || [])];
            
            const earliestAbsenceDate = allAbsenceDates.length > 0 
                ? new Date(Math.min(...allAbsenceDates.map(date => new Date(date)))) 
                : null;
            const latestAbsenceDate = allAbsenceDates.length > 0 
                ? new Date(Math.max(...allAbsenceDates.map(date => new Date(date)))) 
                : null;
                
            const earliestLeaveDate = allLeaveDates.length > 0 
                ? new Date(Math.min(...allLeaveDates.map(date => new Date(date)))) 
                : null;
            const latestLeaveDate = allLeaveDates.length > 0 
                ? new Date(Math.max(...allLeaveDates.map(date => new Date(date)))) 
                : null;
            
            // Format dates for display
            const formatDateRange = (start, end) => {
                if (!start) return '-';
                const startStr = start.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
                if (!end || start.getTime() === end.getTime()) return startStr;
                const endStr = end.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
                return `${startStr} - ${endStr}`;
            };
            
            row.innerHTML = `
                <td>${soldier.name}</td>
                <td>${soldier.rank}</td>
                <td>${soldier.unit}</td>
                <td>${soldier.absences || 0}</td>
                <td>${formatDateRange(earliestAbsenceDate, latestAbsenceDate)}</td>
                <td>${soldier.leaves || 0}</td>
                <td>${formatDateRange(earliestLeaveDate, latestLeaveDate)}</td>
                <td>${(soldier.absences || 0) + (soldier.leaves || 0)}</td>
                <td>${absenceRanges.length > 0 ? absenceRanges.join('') : '-'}</td>
                <td>${leaveRanges.length > 0 ? leaveRanges.join('') : '-'}</td>
                <td>${soldier.notes ? soldier.notes.join('<br>') : ''}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    // Update the report summary
    updateReportSummary(year, month, totalSoldiers, totalAbsences, totalLeaves, avgAbsenceRate, unit);
}
