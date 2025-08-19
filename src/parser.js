// HTML Parser for 3GPP TDoc data extraction

function fixCharacterEncoding(text) {
    if (!text) return text;
    return text
        .replace(/�/g, "'")  // Fix replacement character to apostrophe
        .replace(/'/g, "'")  // Fix right single quotation mark
        .replace(/'/g, "'")  // Fix left single quotation mark
        .replace(/"/g, '"')  // Fix left double quotation mark
        .replace(/"/g, '"')  // Fix right double quotation mark
        .replace(/–/g, '-')  // Fix en dash
        .replace(/—/g, '-')  // Fix em dash
        .replace(/…/g, '...') // Fix ellipsis
        .trim();
}

export function parseTdocHtml(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Get table rows (skip header)
    const table = doc.querySelector('table');
    if (!table) throw new Error('No table found in HTML');
    
    const headerRow = table.querySelector('tr');
    const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
    
    // Check if "My Approval/Comments" column already exists
    const hasApprovalColumn = headerCells.some(cell => 
        cell.textContent.trim().toLowerCase().includes('my approval') ||
        cell.textContent.trim().toLowerCase().includes('approval/comments')
    );
    
    // Find the column index for existing approval/comments column
    let approvalColumnIndex = -1;
    if (hasApprovalColumn) {
        approvalColumnIndex = headerCells.findIndex(cell => 
            cell.textContent.trim().toLowerCase().includes('my approval') ||
            cell.textContent.trim().toLowerCase().includes('approval/comments')
        );
    }
    
    const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header
    
    const tdocs = rows.map((row, index) => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        
        const minExpectedCells = hasApprovalColumn ? 14 : 13;
        if (cells.length < minExpectedCells) return null; // Skip incomplete rows
        
        let cellIndex = 0;
        const agenda = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const topic = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const tdocCell = cells[cellIndex++];
        const title = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const source = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const type = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const forField = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const avail = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        const treatedCell = cells[cellIndex++];
        
        // Extract tooltip content first
        const treatedTooltip = fixCharacterEncoding(treatedCell?.querySelector('.tooltip .tooltiptext')?.textContent?.trim() || '');
        
        // Get the main text excluding the tooltip
        let treated = '';
        if (treatedCell) {
            // Clone the cell and remove tooltip elements to get clean text
            const cellClone = treatedCell.cloneNode(true);
            const tooltipElements = cellClone.querySelectorAll('.tooltiptext');
            tooltipElements.forEach(el => el.remove());
            treated = fixCharacterEncoding(cellClone.textContent?.trim() || '');
        }
        
        const decision = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        
        // Handle approval/comments column if it exists
        let userComments = '';
        let userApproval = null;
        
        if (hasApprovalColumn) {
            const approvalCell = cells[cellIndex++];
            
            // Check if it's a tooltip structure (exported format)
            const tooltipElement = approvalCell?.querySelector('.tooltip');
            if (tooltipElement) {
                // Extract approval from main text and comments from tooltip
                const mainText = tooltipElement.textContent?.replace(tooltipElement.querySelector('.tooltiptext')?.textContent || '', '').trim();
                const tooltipText = tooltipElement.querySelector('.tooltiptext')?.textContent?.trim();
                
                userApproval = fixCharacterEncoding(mainText || '');
                userComments = fixCharacterEncoding(tooltipText || '');
            } else {
                // Regular text content
                const fullText = fixCharacterEncoding(approvalCell?.textContent?.trim() || '');
                
                // Try to detect if it's just approval status
                const approvalStatuses = ['approved', 'noted', 'revised', 'postponed', 'not pursued'];
                if (approvalStatuses.includes(fullText.toLowerCase())) {
                    userApproval = fullText.toLowerCase();
                    userComments = '';
                } else {
                    // Treat as comments
                    userComments = fullText;
                }
            }
        }
        
        const wdrn = fixCharacterEncoding(cells[cellIndex++]?.textContent?.trim() || '');
        
        // Extract replaced-by with potential links
        const replacedByCell = cells[cellIndex++];
        const replacedByLink = replacedByCell?.querySelector('a');
        const replacedBy = fixCharacterEncoding(replacedByCell?.textContent?.trim() || '');
        const replacedByHref = replacedByLink?.getAttribute('href') || '';
        
        // Extract replaces with potential links  
        const replacesCell = cells[cellIndex++];
        const replacesLink = replacesCell?.querySelector('a');
        const replaces = fixCharacterEncoding(replacesCell?.textContent?.trim() || '');
        const replacesHref = replacesLink?.getAttribute('href') || '';
        
        // Extract TDoc number and link
        const tdocLink = tdocCell?.querySelector('a');
        const tdocNumber = fixCharacterEncoding(tdocLink?.textContent?.replace(/[‑-]/g, '-').trim() || '');
        const tdocHref = tdocLink?.getAttribute('href') || '';
        
        // Extract individual cell colors
        function getCellColor(cell) {
            const bgcolor = cell?.getAttribute('bgcolor');
            if (bgcolor && bgcolor !== '#FFFFFF') {
                return bgcolor;
            }
            return '#FFFFFF';
        }
        
        const cellColors = {
            agenda: getCellColor(cells[0]),
            topic: getCellColor(cells[1]), 
            tdoc: getCellColor(tdocCell),
            title: getCellColor(cells[3]),
            source: getCellColor(cells[4]),
            type: getCellColor(cells[5]),
            for: getCellColor(cells[6]),
            avail: getCellColor(cells[7]),
            treated: getCellColor(treatedCell),
            decision: getCellColor(cells[cellIndex - 1]), // decision cell
            wdrn: getCellColor(cells[cellIndex + (hasApprovalColumn ? 1 : 0)]),
            replacedBy: getCellColor(replacedByCell),
            replaces: getCellColor(replacesCell)
        };
        
        // Get background color for status inference (use tdoc cell as primary indicator)
        const bgColor = cellColors.tdoc;
        
        // Map original HTML colors to CSS classes
        let originalColorClass = '';
        if (bgColor === '#99FF33') {
            originalColorClass = 'original-green';
        } else if (bgColor === '#FFFF99') {
            originalColorClass = 'original-yellow';
        } else if (bgColor === '#FF8566') {
            originalColorClass = 'original-orange';
        }
        
        // User approval is already handled above in the approval/comments parsing

        return {
            id: `${tdocNumber}-${index}`, // Unique ID
            agenda,
            topic,
            tdocNumber,
            tdocHref,
            title,
            source,
            type,
            for: forField,
            avail,
            treated,
            treatedTooltip,
            decision,
            wdrn,
            replacedBy,
            replacedByHref,
            replaces,
            replacesHref,
            originalBgColor: bgColor,
            originalColorClass,
            cellColors, // Add individual cell colors
            // User fields (from existing data or defaults)
            userApproval,
            userComments,
            selected: false,
            isRevision: false,
            parentTdoc: null,
            revisionNumber: null
        };
    }).filter(Boolean);
    
    return tdocs;
}

export function extractVersionInfo(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Try to extract date from document
    const dateElements = doc.querySelectorAll('p font');
    let extractedDate = '';
    
    for (const elem of dateElements) {
        const text = elem.textContent.trim();
        if (text.match(/\d{4}-\d{2}-\d{2}/)) {
            extractedDate = text;
            break;
        }
    }
    
    // Create consistent timestamp format
    const now = new Date();
    const formatTimestamp = (date) => date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, 'h');
    
    const versionName = extractedDate ? 
        `Version_${extractedDate.replace(/[\s:]/g, '_')}` : 
        `Version_${formatTimestamp(now)}`;
    
    return {
        name: versionName,
        timestamp: now.toISOString(),
        originalDate: extractedDate,
        formattedDate: formatTimestamp(now)
    };
}

export function createNewVersion(existingVersions, htmlContent, userChanges = []) {
    const versionInfo = extractVersionInfo(htmlContent);
    const tdocs = parseTdocHtml(htmlContent);
    
    // Apply user changes to new data (rebase)
    const rebasedTdocs = applyUserChanges(tdocs, userChanges);
    
    return {
        ...versionInfo,
        id: Date.now().toString(),
        tdocs: rebasedTdocs,
        isActive: true
    };
}

function applyUserChanges(tdocs, userChanges) {
    // Create a map for quick lookups
    const changeMap = new Map();
    userChanges.forEach(change => {
        changeMap.set(change.tdocNumber, change);
    });
    
    return tdocs.map(tdoc => {
        const userChange = changeMap.get(tdoc.tdocNumber);
        if (userChange) {
            return {
                ...tdoc,
                userApproval: userChange.userApproval,
                userComments: userChange.userComments
            };
        }
        return tdoc;
    });
}