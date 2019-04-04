import { Component, OnInit, Inject} from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog.component',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class PosPaymentDialogComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<PosPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit() {

  }

  pushButton(okButton: Boolean) {
    this.dialogRef.close(okButton);
  }

}
