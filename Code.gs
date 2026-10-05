const SHEET_PEMASUKAN = 'Pemasukan';
const SHEET_PENGELUARAN = 'Pengeluaran';
const SHEET_HUTANG = 'Hutang';
const SHEET_DASHBOARD = 'Dashboard';
const SHEET_SETTING = 'Setting';

// Fungsi utama untuk mengatur dan mendapatkan Spreadsheet
function getOrCreateSpreadsheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // Jika tidak terikat pada spreadsheet (standalone), cek properti
    const prop = PropertiesService.getScriptProperties();
    const ssId = prop.getProperty('SPREADSHEET_ID');
    if (ssId) {
      try { ss = SpreadsheetApp.openById(ssId); } catch (e) {}
    }
    
    // Jika masih tidak ada, buat baru
    if (!ss) {
      ss = SpreadsheetApp.create('FinTrack V2 Database');
      prop.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }
  return ss;
}

function setupSheets(ss) {
  let updated = false;
  
  if (!ss.getSheetByName(SHEET_PEMASUKAN)) {
    let sheet = ss.insertSheet(SHEET_PEMASUKAN);
    sheet.appendRow(['ID', 'Tanggal', 'Kategori', 'Nominal', 'Keterangan', 'Timestamp']);
    sheet.getRange('1:1').setFontWeight('bold');
    updated = true;
  }
  if (!ss.getSheetByName(SHEET_PENGELUARAN)) {
    let sheet = ss.insertSheet(SHEET_PENGELUARAN);
    sheet.appendRow(['ID', 'Tanggal', 'Kategori', 'Nominal', 'Keterangan', 'Bukti URL', 'Timestamp']);
    sheet.getRange('1:1').setFontWeight('bold');
    updated = true;
  }
  if (!ss.getSheetByName(SHEET_HUTANG)) {
    let sheet = ss.insertSheet(SHEET_HUTANG);
    sheet.appendRow(['ID', 'Tanggal', 'Pihak', 'Nominal', 'Terbayar', 'Keterangan', 'Status', 'Timestamp']);
    sheet.getRange('1:1').setFontWeight('bold');
    updated = true;
  }
  if (!ss.getSheetByName(SHEET_DASHBOARD)) {
    let sheet = ss.insertSheet(SHEET_DASHBOARD);
    sheet.getRange('A1').setValue('DASHBOARD KEUANGAN').setFontWeight('bold').setFontSize(16);
    sheet.getRange('A3').setValue('Total Pemasukan');
    sheet.getRange('B3').setFormula(`=SUM('${SHEET_PEMASUKAN}'!D:D)`);
    sheet.getRange('A4').setValue('Total Pengeluaran');
    sheet.getRange('B4').setFormula(`=SUM('${SHEET_PENGELUARAN}'!D:D)`);
    sheet.getRange('A5').setValue('Total Hutang (Sisa)');
    sheet.getRange('B5').setFormula(`=SUM('${SHEET_HUTANG}'!D:D) - SUM('${SHEET_HUTANG}'!E:E)`);
    sheet.getRange('A6').setValue('Saldo Saat Ini');
    sheet.getRange('B6').setFormula('=B3-B4');
    
    sheet.getRange('B3:B6').setNumberFormat('"Rp"#,##0');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 150);
    updated = true;
  }
  if (!ss.getSheetByName(SHEET_SETTING)) {
    let sheet = ss.insertSheet(SHEET_SETTING);
    sheet.appendRow(['Username', 'Password']);
    sheet.appendRow(['admin', 'admin']); // Default credentials
    sheet.getRange('1:1').setFontWeight('bold');
    updated = true;
  }
  
  // Hapus "Sheet1" bawaan jika membuat sheet baru
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && updated && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
}

// Menangani request GET (CORS preflight)
function doGet(e) {
  return handleResponse(e);
}

// Menangani request POST (Aksi utama)
function doPost(e) {
  return handleResponse(e);
}

function handleResponse(e) {
  let output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    let data;
    if (e.postData) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    const action = data.action;
    const ss = getOrCreateSpreadsheet();
    setupSheets(ss); // Pastikan sheet tersedia secara otomatis
    
    if (action === 'login') {
      const sheet = ss.getSheetByName(SHEET_SETTING);
      const settingData = sheet.getDataRange().getValues();
      let isValid = false;
      
      for (let i = 1; i < settingData.length; i++) {
        if (settingData[i][0] === data.username && settingData[i][1] === data.password) {
          isValid = true;
          break;
        }
      }
      
      if (isValid) {
        return output.setContent(JSON.stringify({status: 'success'}));
      } else {
        return output.setContent(JSON.stringify({status: 'error', message: 'Username atau Password salah!'}));
      }
    }
    else if (action === 'get_all') {
      const result = {
        pemasukan: getSheetDataAsObjects(ss.getSheetByName(SHEET_PEMASUKAN)),
        pengeluaran: getSheetDataAsObjects(ss.getSheetByName(SHEET_PENGELUARAN)),
        hutang: getSheetDataAsObjects(ss.getSheetByName(SHEET_HUTANG))
      };
      return output.setContent(JSON.stringify({status: 'success', data: result}));
    }
    else if (action === 'add_pemasukan') {
      const sheet = ss.getSheetByName(SHEET_PEMASUKAN);
      const id = generateId();
      sheet.appendRow([id, data.tanggal, data.kategori, data.nominal, data.keterangan, new Date()]);
      return output.setContent(JSON.stringify({status: 'success', id: id}));
    }
    else if (action === 'add_pengeluaran') {
      const sheet = ss.getSheetByName(SHEET_PENGELUARAN);
      const id = generateId();
      let fileUrl = "";
      
      // Handle file upload
      if (data.fileData) {
        const decoded = Utilities.base64Decode(data.fileData);
        const blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
        
        let folders = DriveApp.getFoldersByName("FinTrack Receipts");
        let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("FinTrack Receipts");
        let file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        // Gunakan link direct/export view supaya bisa tampil langsung
        fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      }
      
      sheet.appendRow([id, data.tanggal, data.kategori, data.nominal, data.keterangan, fileUrl, new Date()]);
      return output.setContent(JSON.stringify({status: 'success', id: id}));
    }
    else if (action === 'add_hutang') {
      const sheetHutang = ss.getSheetByName(SHEET_HUTANG);
      const id = generateId();
      
      sheetHutang.appendRow([id, data.tanggal, data.pihak, data.nominal, 0, data.keterangan, 'Belum Lunas', new Date()]);
      
      // Saat berhutang (meminjamkan uang ke orang/pihak lain), tercatat di Pengeluaran juga
      const sheetPengeluaran = ss.getSheetByName(SHEET_PENGELUARAN);
      const idPengeluaran = generateId();
      sheetPengeluaran.appendRow([idPengeluaran, data.tanggal, 'Peminjaman Duit (Hutang)', data.nominal, `Pinjaman kepada ${data.pihak} (ID: ${id})`, "", new Date()]);

      return output.setContent(JSON.stringify({status: 'success', id: id}));
    }
    else if (action === 'pay_hutang') {
      const sheetHutang = ss.getSheetByName(SHEET_HUTANG);
      const dataHutang = sheetHutang.getDataRange().getValues();
      let updated = false;
      
      for (let i = 1; i < dataHutang.length; i++) {
        if (dataHutang[i][0] === data.id) {
          let nominal = parseFloat(dataHutang[i][3]);
          let terbayar = parseFloat(dataHutang[i][4] || 0) + parseFloat(data.nominal);
          let status = (terbayar >= nominal) ? 'Lunas' : 'Belum Lunas';
          
          sheetHutang.getRange(i + 1, 5).setValue(terbayar);
          sheetHutang.getRange(i + 1, 7).setValue(status);
          updated = true;
          break;
        }
      }
      
      if (updated) {
        // Saat hutang dibayar (uang kembali), tercatat di Pemasukan
        const sheetPemasukan = ss.getSheetByName(SHEET_PEMASUKAN);
        const idPemasukan = generateId();
        sheetPemasukan.appendRow([idPemasukan, data.tanggal, 'Pembayaran Hutang', data.nominal, `Pembayaran hutang (Ref ID: ${data.id})`, new Date()]);
        return output.setContent(JSON.stringify({status: 'success'}));
      } else {
        return output.setContent(JSON.stringify({status: 'error', message: 'Hutang tidak ditemukan'}));
      }
    }
    else if (action === 'edit_pemasukan' || action === 'edit_pengeluaran' || action === 'edit_hutang') {
      const sheetName = action === 'edit_pemasukan' ? SHEET_PEMASUKAN : (action === 'edit_pengeluaran' ? SHEET_PENGELUARAN : SHEET_HUTANG);
      const sheet = ss.getSheetByName(sheetName);
      const allData = sheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === data.id) {
          if (action === 'edit_pemasukan') {
            sheet.getRange(i + 1, 2).setValue(data.tanggal);
            sheet.getRange(i + 1, 3).setValue(data.kategori);
            sheet.getRange(i + 1, 4).setValue(data.nominal);
            sheet.getRange(i + 1, 5).setValue(data.keterangan);
          } else if (action === 'edit_pengeluaran') {
            sheet.getRange(i + 1, 2).setValue(data.tanggal);
            sheet.getRange(i + 1, 3).setValue(data.kategori);
            sheet.getRange(i + 1, 4).setValue(data.nominal);
            sheet.getRange(i + 1, 5).setValue(data.keterangan);
            // Handle file update if present
            if (data.fileData) {
              const decoded = Utilities.base64Decode(data.fileData);
              const blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
              let folders = DriveApp.getFoldersByName("FinTrack Receipts");
              let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("FinTrack Receipts");
              let file = folder.createFile(blob);
              file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
              sheet.getRange(i + 1, 6).setValue("https://drive.google.com/uc?export=view&id=" + file.getId());
            }
          } else if (action === 'edit_hutang') {
            sheet.getRange(i + 1, 2).setValue(data.tanggal);
            sheet.getRange(i + 1, 3).setValue(data.pihak);
            sheet.getRange(i + 1, 4).setValue(data.nominal);
            sheet.getRange(i + 1, 6).setValue(data.keterangan);
            // We do not recalculate status automatically on edit, or maybe we should?
            let terbayar = allData[i][4] || 0;
            let status = (terbayar >= parseFloat(data.nominal)) ? 'Lunas' : 'Belum Lunas';
            sheet.getRange(i + 1, 7).setValue(status);
          }
          return output.setContent(JSON.stringify({status: 'success'}));
        }
      }
      return output.setContent(JSON.stringify({status: 'error', message: 'Data tidak ditemukan'}));
    }
    else if (action === 'delete_pemasukan' || action === 'delete_pengeluaran' || action === 'delete_hutang') {
      const sheetName = action === 'delete_pemasukan' ? SHEET_PEMASUKAN : (action === 'delete_pengeluaran' ? SHEET_PENGELUARAN : SHEET_HUTANG);
      const sheet = ss.getSheetByName(sheetName);
      const allData = sheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === data.id) {
          sheet.deleteRow(i + 1);
          return output.setContent(JSON.stringify({status: 'success'}));
        }
      }
      return output.setContent(JSON.stringify({status: 'error', message: 'Data tidak ditemukan'}));
    }
    
    return output.setContent(JSON.stringify({status: 'error', message: 'Action not found'}));
    
  } catch (error) {
    return output.setContent(JSON.stringify({status: 'error', message: error.toString()}));
  }
}

// Utility Functions
function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      // Format date if valid date object
      if (val instanceof Date) {
        // Convert to YYYY-MM-DD local timezone
        const offset = val.getTimezoneOffset() * 60000;
        val = new Date(val.getTime() - offset).toISOString().split('T')[0];
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

function generateId() {
  return 'ID' + new Date().getTime() + Math.floor(Math.random() * 1000);
}
