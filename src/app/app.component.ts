import { Component, NgZone, OnInit, output, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { BehaviorSubject, Subscription, interval, map, startWith } from 'rxjs';
import * as XLSX from 'xlsx';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipGrid } from '@angular/material/chips';
import { AppService } from './app.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatRadioModule } from '@angular/material/radio';
@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  fileBytes: Uint8Array | null = null;
  @ViewChild('chipList') chipList!: MatChipGrid;
  title = 'TAMPAR';

  // dummy data
  modeOptions = [
    { value: 'GENERATE', label: 'Generate DDL' },
    { value: 'COMPARE', label: 'Compare' },
  ];
  schemaOptions = ['SCHEMA_A', 'SCHEMA_B', 'SCHEMA_C', 'SCHEMA_D', 'ZZX'];
  filteredSchema: string[] = [];
  envOptions = ['DEV', 'QA', 'UAT', 'SOC', 'PRODLIKE', 'PROD'];
  form: FormGroup;
  selectedSchemas: string[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];
  uploadedFileName = '';
  uploadStatus: 'idle' | 'success' | 'error' = 'idle';
  log$ = new BehaviorSubject<string[]>([]);
  processing = false;
  progress = 0;
  private procSub: Subscription | null = null;
  schemaCtrl = new FormControl<string>('', Validators.required);

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private _service: AppService
  ) {
    this.form = this.fb.group({
      mode: ['', Validators.required],
      useExcel: [false, Validators.required],
      uploadFile: [null, Validators.required],
      schema: [[], Validators.required], // multi-selection
      envSource: ['', Validators.required],
      envTarget: ['', Validators.required],
      outputMode: ['FULL'],
    });
  }

  ngOnInit() {
    this.filteredSchema = this.schemaOptions.slice();
    // Setiap kali value pada input autocomplete berubah, filteredSchema akan diupdate
    this.schemaCtrl.valueChanges
      .pipe(
        startWith(''),
        map((value: string | null) => this._filter(value))
      )
      .subscribe((filtered) => {
        this.filteredSchema = filtered;
      });
  }

  addSchema(event: any): void {
    const input = event.input;
    const value = event.value;
    if (this.selectedSchemas.length == 5) {
      this.snackBar.open('Max 5 Schema', 'OK', { duration: 1800 });
      return;
    }
    if ((value || '').trim()) {
      const val = value.trim().toUpperCase(); // Normalize to uppercase
      if (
        !this.selectedSchemas.includes(val) &&
        this.filteredSchema.includes(val)
      ) {
        this.selectedSchemas.push(val);
      }
    }

    if (input) {
      input.value = '';
    }
    this.schemaCtrl.setValue('');
  }

  removeSchema(schema: string): void {
    const index = this.selectedSchemas.indexOf(schema);

    if (index >= 0) {
      this.selectedSchemas.splice(index, 1);
    }
  }

  selectSchema(event: any): void {
    const value = event.option.value;
    if (this.selectedSchemas.length == 5) {
      this.snackBar.open('Max 5 Schema', 'OK', { duration: 1800 });
      return;
    }
    if (!this.selectedSchemas.includes(value)) {
      this.selectedSchemas.push(value);
    }
    this.schemaCtrl.setValue('');
  }

  private _filter(value: string | null): string[] {
    const filterValue = (value || '').toLowerCase();
    return this.schemaOptions.filter(
      (option) =>
        option.toLowerCase().includes(filterValue) &&
        !this.selectedSchemas.includes(option)
    );
  }

  resetSelectionsBelowMode() {
    // keep empty selections and state
    this.form.patchValue({
      useExcel: false,
      uploadFile: null,
      schema: [],
      envSource: '',
      envTarget: '',
      outputMode: 'FULL',
    });
    this.uploadedFileName = '';
    this.uploadStatus = 'idle';
    this.schemaCtrl = new FormControl<string>('', Validators.required);
    this.logClear();
  }

  // Download template using SheetJS (create simple workbook)
  downloadTemplate() {
    // const wb = XLSX.utils.book_new();
    // const wsData = [
    //   ['OBJECT_NAME', 'OBJECT_TYPE', 'COMMENTS'],
    //   ['TABLE_A', 'TABLE', 'sample'],
    //   ['VIEW_B', 'VIEW', 'sample'],
    // ];
    // const ws = XLSX.utils.aoa_to_sheet(wsData);
    // XLSX.utils.book_append_sheet(wb, ws, 'template');
    // const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    // const blob = new Blob([wbout], {
    //   type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = 'tampar-template.xlsx';
    // a.click();
    // URL.revokeObjectURL(url);
    this._service.getDownloadFile();
    this.snackBar.open('Template downloaded', 'OK', { duration: 1500 });
  }

  // file input handler (native)
  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx')) {
      this.uploadStatus = 'error';
      this.snackBar.open('Format tidak didukung — hanya .xlsx', 'OK', {
        duration: 2000,
      });
      return;
    }

    // read file and convert to Uint8Array ([]byte)
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (data instanceof ArrayBuffer) {
          this.fileBytes = new Uint8Array(data);
        } else {
          throw new Error('FileReader result is not ArrayBuffer');
        }
        const wb = XLSX.read(data, { type: 'array' });
        // optional: basic validation: sheet exists
        const sheets = wb.SheetNames;
        if (sheets.length === 0) throw new Error('No sheets found');
        // success
        this.uploadStatus = 'success';
        this.uploadedFileName = file.name;
        this.form.patchValue({ uploadFile: file });
        this.snackBar.open('Upload success', 'OK', { duration: 1500 });
        // append log
        this.logAppend(
          `[UPLOAD] ${file.name} loaded (${sheets.length} sheet(s))`
        );
      } catch (err) {
        console.error(err);
        this.uploadStatus = 'error';
        this.snackBar.open('File gagal dibaca (bukan xlsx valid?)', 'OK', {
          duration: 2000,
        });
        this.logAppend(`[UPLOAD-ERROR] ${file.name} - ${String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // helper to append log line
  logAppend(line: string) {
    const arr = this.log$.value.slice();
    arr.push(`${new Date().toLocaleTimeString()}  ${line}`);
    this.log$.next(arr);
    // auto scroll handled in template
  }

  logClear() {
    this.log$.next([]);
  }

  // main "Process" button
  onProcess() {
    if (this.processing) return;
    // step: validation according to rules

    this.form.get('schema')?.setValue(this.selectedSchemas);
    const mode = this.form.value?.mode;
    const useExcel = this.form.value?.useExcel;
    const schema = this.form.value?.schema || [];
    const envSource = this.form.value?.envSource;
    const envTarget = this.form.value?.envTarget;
    const outputMode = this.form.value?.outputMode;
    //const formValues = this.form.getRawValue();
    // validations
    if (!mode) {
      this.snackBar.open('Pilih Mode terlebih dahulu', 'OK', {
        duration: 1800,
      });
      return;
    }
    if (useExcel) {
      if (!this.form.value.uploadFile) {
        this.snackBar.open(
          'Upload file .xlsx terlebih dahulu saat Use Excel ON',
          'OK',
          { duration: 2000 }
        );
        return;
      }
      if (!envSource) {
        this.snackBar.open('Pilih Env Source', 'OK', { duration: 1800 });
        return;
      }
      if (mode === 'COMPARE' && !envTarget) {
        this.snackBar.open(
          'Compare by Excel but Env Target wajib dipilih',
          'OK',
          { duration: 1800 }
        );
        return;
      }
      if (!this.fileBytes) {
        this.snackBar.open('File belum dikonversi ke byte', 'OK', {
          duration: 1800,
        });
        return;
      }
    } else {
      // non-excel
      if (!schema || schema.length === 0) {
        this.snackBar.open('Pilih minimal 1 schema (non-excel)', 'OK', {
          duration: 1800,
        });
        return;
      }
      if (!envSource && (mode === 'GENERATE' || !envTarget)) {
        this.snackBar.open(
          'Pilih Env Source dan Env Target (non-excel)',
          'OK',
          { duration: 1800 }
        );
        return;
      }
    }
    console.log('Form Log', this.form.value);
    if (useExcel) {
      console.log('File bytes:', this.fileBytes);
    }
    // start simulated process with realtime log
    this.logClear();

    console.log('Form After Log', this.form.value);
    this.processing = true;
    this.progress = 0;
    this.logAppend(
      `[PROCESS] Mode=${mode} | useExcel=${
        useExcel ? 'YES' : 'NO'
      } | OutputMode=${outputMode}`
    );
    if (useExcel)
      this.logAppend(
        `[INFO] Using uploaded file: ${this.uploadedFileName} | Bytes: ${this.fileBytes?.length}`
      );

    // simulate steps using interval
    let step = 0;
    const steps: string[] = [];
    if (mode === 'GENERATE') {
      if (useExcel) {
        steps.push('Read Excel list of objects');
        steps.push('Resolve objects in Env Source');
        steps.push('Generate DDL for each object');
        steps.push('Prepare summary (missing objects report)');
      } else {
        steps.push('Resolve schemas');
        steps.push('Collect objects for each schema');
        steps.push('Generate DDL for objects');
      }
    } else {
      // compare
      if (useExcel) {
        steps.push('Read Excel list of objects');
        steps.push('Compare objects between Env Source and Env Target');
        steps.push(
          'Collect differences -> extract DDL for missing/changed objects'
        );
      } else {
        steps.push('Resolve schemas (multi)');
        steps.push('List objects');
        steps.push('Compare Env Source vs Env Target');
        steps.push('Collect DDL for differences');
      }
    }
    // simulate progress with interval
    const total = steps.length + 2;
    this.procSub = interval(900).subscribe((i) => {
      this.ngZone.run(() => {
        if (step < steps.length) {
          this.logAppend(`[STEP] ${steps[step]}`);
        } else if (step === steps.length) {
          this.logAppend('[STEP] Finalizing results...');
        } else {
          this.logAppend('[DONE] Process finished.');
        }
        step++;
        this.progress = Math.min(100, Math.round((step / total) * 100));
        if (step > total) {
          this.processing = false;
          this.procSub?.unsubscribe();
          this.procSub = null;
          // summary message (dummy)
          this.logAppend(
            `[SUMMARY] Found 3 differences (dummy) — DDL extracted`
          );
          this.snackBar.open('Process complete', 'OK', { duration: 1800 });
        }
      });
    });
  }

  // helper: whether Upload input should be shown and enabled
  shouldShowUpload() {
    return this.form.value.useExcel === true;
  }

  onCheckUseExcel(event: MatCheckboxChange) {
    if (event.checked) {
      this.schemaCtrl.disable();
      this.schemaCtrl.clearValidators();
      this.schemaCtrl.setValue('');
      this.form.get('schema')!.disable();
      this.form.get('schema')!.clearValidators();
      this.form.get('schema')?.setValue('');
      this.form.get('outputMode')!.enable();
      this.form.get('outputMode')?.setValidators(Validators.required);
    } else {
      this.form.get('outputMode')!.disable();
      this.form.get('outputMode')!.clearValidators();
      this.form.get('outputMode')?.setValue('');
      this.form.get('schema')!.enable();
      this.form.get('schema')?.setValidators(Validators.required);
      this.schemaCtrl.enable();
      this.schemaCtrl.setValidators(Validators.required);
    }
    this.form.updateValueAndValidity();
  }

  onMode() {
    if (this.form.get('mode')?.value == 'GENERATE') {
      this.form.get('envTarget')?.disable();
      this.form.get('envTarget')?.clearValidators();
      this.form.get('envTarget')?.setValue('');
    } else {
      this.form.get('envTarget')?.enable();
      this.form.get('envTarget')?.setValidators(Validators.required);
    }
    this.form.updateValueAndValidity();
  }

  onEnv(type: string) {
    if (this.form.value?.envSource == this.form.value?.envTarget) {
      this.snackBar.open('Env Source dan Env Target tidak boleh sama', 'OK', {
        duration: 2000,
      });
      if (type == 'SOURCE') {
        this.form.get('envSource')?.setValue('');
      } else {
        this.form.get('envTarget')?.setValue('');
      }
    }
  }
}
