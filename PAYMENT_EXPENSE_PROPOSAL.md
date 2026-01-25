# Payment & Expense Management - Analysis & Proposal

## 📊 Current System Analysis

### **Student Payment Tracking** (What exists)
```
models:
- Enrollment (student ↔ course link)
  - custom_price (what they pay for this course)
  - status (ACTIVE, SUSPENDED, COMPLETED, CANCELLED)
  
- Subscription (payment schedule)
  - MONTHLY or QUARTERLY  
  - start_date, end_date
  - amount
  - payment_status (PENDING, PAID, OVERDUE, CANCELLED)
  
- Payment (actual payments)
  - student
  - amount
  - status (PAID, PENDING, LATE)
  - method (CARD, TRANSFER, CASH, CHECK)
  - date
```

### **Current Problems** ❌

1. **No UI to add expenses** - Only backend model exists
2. **No UI to record student payments** - Only backend exists
3. **No payment tracking dashboard** - Can't see:
   - Who hasn't paid this month
   - Who has outstanding balances
   - Payment history per student
4. **No subscription management** - Can't see:
   - Which students are on monthly vs quarterly plans
   - When subscriptions renew
5. **Manual work required** - No automation for:
   - Generating monthly invoices
   - Marking late payments
   - Calculating balances

---

## 🎯 Proposed Solution

### **Phase 1: Essential Payment Tracking** (Priority: HIGH)

#### A. Student Payment Status Dashboard
**Location**: `/dashboard/finances/payments`

**Features**:
- Table showing ALL students with payment status
- Filter by: Paid / Pending / Late / Overdue
- Search by student name
- Shows:
  - Student name
  - Number of enrolled courses
  - Monthly amount due
  - Last payment date
  - Payment status
  - Outstanding balance
  - Action buttons (Record Payment, View History)

**Backend Endpoint**: `GET /finances/payment-status/`
```json
{
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "enrolled_courses": 3,
      "monthly_due": 150.00,
      "subscription_type": "MONTHLY",
      "last_payment_date": "2026-01-01",
      "status": "PAID",  // PAID, PENDING, OVERDUE
      "outstanding_balance": 0.00,
      "days_overdue": 0
    }
  ]
}
```

#### B. Record Payment Dialog
**Component**: `<RecordPaymentDialog />`

**Form Fields**:
- Student (select dropdown)
- Amount
- Payment method (Cash, Card, Transfer, Check)
- Date
- Invoice reference (auto-generated)
- Notes

**Action**: POST `/finances/payments/`

#### C. Student Financial Profile
**Location**: `/dashboard/students/[id]` (add new tab)

**Shows**:
- Subscription details (MONTHLY vs QUARTERLY)
- All enrolled courses with prices
- Total monthly/quarterly amount
- Payment history table
- Outstanding balance
- Next payment due date
- Quick pay button

---

### **Phase 2: Expense Management** (Priority: HIGH)

#### A. Add Expense Button & Dialog
**Location**: `/dashboard/finances` - Add "+ New Expense" button

**Component**: `<AddExpenseDialog />`

**Form Fields**:
- Description
- Amount
- Category dropdown:
  - Salary (Teacher)
  - Rent
  - Utilities
  - Equipment
  - Maintenance
  - Other
- Date
- Status (Paid / Pending)
- Notes

**Action**: POST `/finances/expenses/`

#### B. Teacher Salary Auto-Expense
**Feature**: Automatically create expense records for teacher salaries

**Backend**: Add management command or cron job:
```python
# python manage.py generate_teacher_expenses --month 1 --year 2026
```

Creates expense records like:
```json
{
  "description": "Salary - Prof. Marie Dubois (January 2026)",
  "amount": 2500.00,
  "category": "SALARY",
  "date": "2026-01-31",
  "status": "PENDING",
  "teacher_id": 5
}
```

---

### **Phase 3: Smart Automation** (Priority: MEDIUM)

#### A. Automatic Subscription Billing
**Feature**: Auto-generate payment records at start of each month/quarter

**How it works**:
1. Cron job runs on 1st of each month
2. Finds all ACTIVE subscriptions
3. Creates Payment records with status=PENDING
4. Sends email/notification to students

#### B. Overdue Payment Detection
**Feature**: Auto-mark payments as OVERDUE

**Logic**:
```
If payment_date + 7 days < today AND status == PENDING:
  status = OVERDUE
```

#### C. Balance Calculation
**Feature**: Real-time calculation of outstanding balances

**Formula**:
```
outstanding_balance = SUM(all_pending_payments) - SUM(all_partial_payments)
```

---

## 🔧 Implementation Plan

### **Week 1: Payment Tracking**

**Day 1-2**: Backend
- [ ] Add endpoint: `GET /finances/payment-status/`
- [ ] Add logic to calculate outstanding balances
- [ ] Add filter for overdue payments

**Day 3-4**: Frontend  
- [ ] Create `<RecordPaymentDialog />` component
- [ ] Add payment status dashboard
- [ ] Add payment history to student profile

**Day 5**: Testing & Refinement

---

### **Week 2: Expense Management**

**Day 1-2**: Backend
- [ ] Add expense creation validation
- [ ] Create teacher salary expense generator
- [ ] Add expense categories filter

**Day 3-4**: Frontend
- [ ] Create `<AddExpenseDialog />` component
- [ ] Add "+ New Expense" button to finances page
- [ ] Add expense edit/delete functionality

**Day 5**: Integration & Testing

---

## 📋 Detailed Feature Breakdown

### **1. Payment Status Tracking**

**Problem**: Can't see who paid and who didn't

**Solution**: Payment Status Dashboard

**View Options**:
- **List View** (default): Table with all students
- **Calendar View**: Monthly calendar showing payment due dates
- **Analytics View**: Charts showing payment trends

**Filters**:
- Status: All / Paid / Pending / Overdue
- Subscription: All / Monthly / Quarterly
- Date range: This month / Last month / Custom

**Actions**:
- Mark as Paid (bulk)
- Send reminder (bulk)
- Export to CSV
- Print invoices

---

### **2. Multi-Course Students**

**Problem**: Student with 3 courses - how to track?

**Solution**: Aggregate Subscription

**Example**:
```
Student: Marie Dupont
Courses:
  - Piano Beginner: 50€/month
  - Guitar Intermediate: 60€/month  
  - Solfège: 30€/month
  
Total: 140€/month

Subscription:
  - Type: MONTHLY
  - Amount: 140€
  - Due date: 1st of each month
  
Payment History:
  - Jan 2026: PAID (140€) - 2026-01-05
  - Feb 2026: PENDING (140€) - Due 2026-02-01
```

**Implementation**:
- When student enrolls in a new course, update subscription amount
- One subscription per student (not per course)
- Payment covers ALL enrolled courses

---

### **3. Different Payment Plans**

**Problem**: Some pay monthly, some quarterly

**Solution**: Flexible Subscription

**Monthly Example**:
```json
{
  "student": "John Doe",
  "subscription_type": "MONTHLY",
  "amount": 150.00,
  "start_date": "2026-01-01",
  "next_payment_due": "2026-02-01",
  "payments": [
    {"month": "January 2026", "status": "PAID", "amount": 150},
    {"month": "February 2026", "status": "PENDING", "amount": 150}
  ]
}
```

**Quarterly Example**:
```json
{
  "student": "Jane Smith",
  "subscription_type": "QUARTERLY",
  "amount": 450.00,  // 3 months × 150€
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "next_payment_due": "2026-04-01",
  "payments": [
    {"period": "Q1 2026", "status": "PAID", "amount": 450},
    {"period": "Q2 2026", "status": "PENDING", "amount": 450}
  ]
}
```

---

### **4. Outstanding Balances**

**Problem**: Student paid partial amount or skipped months

**Solution**: Balance Tracking

**Scenarios**:

**Scenario A: Partial Payment**
```
Due: 150€
Paid: 100€
Balance: 50€ (UNPAID)

Next month:
Due: 150€ + 50€ (previous balance) = 200€
```

**Scenario B: Skipped Month**
```
January: PAID 150€
February: SKIPPED (status: OVERDUE)
March: Now owes 300€ (Feb + Mar)
```

**Implementation**:
```python
def calculate_balance(student):
    total_due = sum(payment.amount for payment in student.pending_payments)
    total_paid = sum(payment.amount for payment in student.paid_payments)
    return total_due - total_paid
```

---

## 🎨 UI Mockups

### **Payment Status Dashboard**

```
┌─────────────────────────────────────────────────────────────┐
│  Finances > Payments                        [+ Record Payment] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filter: [Status ▼] [Subscription ▼] [Date Range ▼] [Search]│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Student       │ Courses │ Monthly │ Status   │ Balance│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ John Doe      │    3    │  150€  │ 🟢 PAID  │   0€   │  │
│  │ Marie Dupont  │    1    │   60€  │ 🟡 PENDING│  60€  │  │
│  │ Paul Martin   │    2    │  110€  │ 🔴 OVERDUE│ 220€  │  │
│  │ Sophie Blanc  │    1    │   50€  │ 🟢 PAID  │   0€   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Record Payment Dialog**

```
┌─────────────────────────────┐
│  Record Payment        [x]  │
├─────────────────────────────┤
│                             │
│  Student: [Select ▼]        │
│  Amount:  [___150€____]     │
│  Method:  [Cash ▼]          │
│  Date:    [2026-01-25]      │
│  Invoice: INV-2026-001      │
│  Notes:   [_____________]   │
│                             │
│      [Cancel]  [Save]       │
└─────────────────────────────┘
```

---

## 🚀 Quick Start Implementation

### **Minimal Viable Solution** (2-3 hours)

1. **Add Expense Dialog**: Simple form to add expenses
2. **Payment Status View**: Show list of students with PAID/PENDING status
3. **Record Payment Button**: Quick way to mark payment as received

This gives you 80% of the functionality with 20% of the effort.

---

## ✅ Recommendations

### **Priority 1 (Do Now)**:
1. Payment status dashboard
2. Record payment dialog
3. Add expense dialog

### **Priority 2 (Next Week)**:
4. Outstanding balance calculation
5. Payment history view
6. Teacher salary auto-expense

### **Priority 3 (Later)**:
7. Automatic subscription billing
8. Payment reminders
9. Invoice generation

---

## 🎯 Next Steps

**Choose your approach**:

**Option A: Minimal (Quick Fix - 3 hours)**
- Add payment recording
- Add expense recording
- Basic status view

**Option B: Complete (Full Solution - 2 weeks)**
- Implement all Phase 1 & 2 features
- Add automation
- Add analytics

**Option C: Phased (Balanced - 1 week)**
- Week 1: Payment tracking + Expense management
- Later: Add automation features

Which option do you prefer?
