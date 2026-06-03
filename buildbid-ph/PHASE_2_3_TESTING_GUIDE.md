# PHASE 2 & 3: QUICK TESTING GUIDE

## 🚀 START HERE: Complete Payment Workflow Test

This guide walks you through testing the entire contract signature and payment flow in ~10 minutes.

---

## TEST 1: CONTRACT SIGNATURES (5 minutes)

### Setup
1. Log in as **CLIENT** (if not already)
2. Post a sample project with:
   - Title: "House Renovation"
   - Budget: ₱100,000
   - Any photos
3. Log in as **CONTRACTOR** and submit a bid
4. As **CLIENT**, accept the bid

### Test Contractor Signature
1. Log in as **CONTRACTOR**
2. Go to **Contracts** page
3. Find the new contract in the list
4. Click **"Sign Contract"** button
5. **Try invalid signature:**
   - Enter "AB" (too short)
   - ✅ Should see error: "Signature must be at least 3 characters"
   - ✅ Button should be disabled
6. **Try valid signature:**
   - Clear and enter "Juan Dela Cruz"
   - ✅ Should see signature preview below with date
   - ✅ Button should enable
   - Click **"Confirm Signature"**
   - ✅ Should see toast: "Contract signed successfully!"
7. Go back to Contracts list
8. Find contract and check signature status
9. ✅ Should show "Client ✓ signed" and "Contractor ✓ signed"

### Test Client Signature
1. Log in as **CLIENT**
2. Go to **Contracts** page
3. Find contract with "Contractor ✓ signed"
4. Click **"Sign Contract"** button
5. Enter "Maria Santos"
6. Click **"Confirm Signature"**
7. ✅ Toast should show "Contract signed successfully!"
8. Check contract status
9. ✅ Both signatures should now show ✓

---

## TEST 2: PAYMENT METHOD SELECTION (3 minutes)

### After Both Signed
1. Still logged in as **CLIENT**
2. Go back to Contracts list
3. Find the contract
4. ✅ Should see green message: "Ready to Pay! Both parties have signed."
5. Click **"Pay Downpayment"** button
6. New modal should open

### Test Payment Methods
1. **Bank Transfer:**
   - Click Bank Transfer option
   - ✅ Should see details:
     - Account Name: BuildBid Philippines
     - Bank: BDO Unibank
     - Account #: 123-456-789-0
     - Swift Code: BDOPHPH

2. **GCash:**
   - Click GCash option
   - ✅ Should see details:
     - GCash #: +63 917 123 4567
     - Name: BuildBid PH Receivable

3. **PayMaya:**
   - Click PayMaya option
   - ✅ Should see details:
     - PayMaya Account: buildbid-ph@paymaya.com
     - Phone: +63 912 345 6789

---

## TEST 3: PAYMENT RECEIPT UPLOAD (4 minutes)

### Select Payment Method and Upload
1. Select **GCash** (or any method)
2. **Drag & drop a receipt image:**
   - Find any image on your computer
   - Drag it into the "Upload Payment Receipt" area
   - ✅ Should see filename with checkmark
3. **Alternative - Click to browse:**
   - Click in the upload area
   - Select a different image file
   - ✅ Should show new filename
4. **Enter transaction reference:**
   - In "Transaction Reference" field, enter:
     "GCash Reference #: GC1234567890"
5. Click **"Submit Payment Proof"** button
6. ✅ Should see: "Payment proof submitted to admin for verification!"

---

## TEST 4: VERIFY FILE VALIDATIONS (2 minutes)

### Test File Size Limit
1. Try to upload a file > 10MB
2. ✅ Should see error: "File is too large. Maximum 10MB."

### Test File Type (if using unrelated files)
1. The form should accept:
   - ✅ JPG images
   - ✅ PNG images
   - ✅ WebP images
   - ✅ PDF files

---

## TEST 5: ADMIN PAYMENT VERIFICATION (optional)

### As ADMIN
1. Go to **Admin Panel** (if available)
2. Look for **"Payments"** or **"Payment Verification"** section
3. ✅ Should see pending payment (Status: PROCESSING)
4. View the receipt image
5. Click **"Approve Payment"**
6. ✅ Payment status should change to COMPLETED
7. ✅ Contract status should change to ACTIVE
8. ✅ Project status should change to IN_PROGRESS

---

## TEST 6: VERIFY CONTRACT DATES

### Check Target Completion Date
1. Log in as **CLIENT**
2. Go to Contracts
3. Click **"View Contract"** on any contract
4. In contract details, look for **"Target Completion"** field
5. ✅ Should show the date from contractor's bid

### Expected Result
- If bid had targetCompletionDate: Shows that date
- If bid didn't have targetCompletionDate: Shows "TBD"
- Format: Month DD, YYYY (e.g., "June 03, 2024")

---

## CHECKLIST: SIGNATURE & PAYMENT FEATURES

### Signatures
- [ ] Contractor can sign with full name
- [ ] Client can sign with full name
- [ ] Error shown for signatures < 3 characters
- [ ] Signature preview shows before confirming
- [ ] Date stamp included in signature preview
- [ ] Toast notification on success
- [ ] Both signatures required before payment
- [ ] Contract shows both signatures signed ✓

### Payment Methods
- [ ] Bank Transfer details visible
- [ ] GCash details visible
- [ ] PayMaya details visible
- [ ] Can select/change payment method
- [ ] Selected method highlighted in orange
- [ ] Instructions clear for each method

### Receipt Upload
- [ ] Can drag & drop receipt
- [ ] Can click to browse receipt
- [ ] File preview shows filename
- [ ] Can change file after selection
- [ ] Transaction reference field available
- [ ] Submit button enabled only with file + method

### Contract Dates
- [ ] Target Completion Date displays
- [ ] Date is readable format
- [ ] Date persists after page refresh

### Validations
- [ ] Signature error < 3 chars
- [ ] File size error > 10MB
- [ ] Payment method required error
- [ ] Receipt file required error

---

## TROUBLESHOOTING

### Issue: "Pay Downpayment" button not appearing
- **Solution**: Check that BOTH signatures are present
- Contract should show ✓ next to both "Client" and "Contractor"

### Issue: Payment method options not showing
- **Solution**: Click the payment modal close button and reopen
- Or refresh the page and try again

### Issue: File upload not working
- **Solution**: Ensure file is < 10MB
- Try a different image file (JPG, PNG, or WebP)

### Issue: Admin can't see payment
- **Solution**: Check that payment status is PROCESSING
- Admin may need to refresh the page

---

## QUICK SUMMARY

**Expected Flow:**
1. Client posts project ✅
2. Contractor bids ✅
3. Client accepts bid → Contract created ✅
4. Contractor signs ✅
5. Client signs ✅
6. Client selects payment method ✅
7. Client uploads receipt ✅
8. Status: PROCESSING → Admin verifies → COMPLETED ✅
9. Contract ACTIVE, Project IN_PROGRESS ✅

**If you see all ✅ marks, PHASE 2 & 3 are working correctly!**

---

## NEXT TESTS (After Main Flow Works)

If you want to test additional scenarios:
- Test with different payment methods (Bank, GCash, PayMaya)
- Test with different image formats (PNG, WebP)
- Test with PDF receipt (if supported)
- Test admin rejection flow (if needed)

---

**Estimated Total Test Time: 15 minutes**

Need help? Check the error messages - they'll tell you exactly what's wrong!
