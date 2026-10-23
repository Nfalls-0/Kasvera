
const STORAGE_KEY = "monetra-transactions";
const BUDGET_KEY = "kasvera-monthly-budget";

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expense");

const budgetForm = document.getElementById("budget-form");
const monthlyBudgetInput = document.getElementById("monthly-budget");
const budgetLimitElement = document.getElementById("budget-limit");
const budgetSpentElement = document.getElementById("budget-spent");
const budgetRemainingElement = document.getElementById("budget-remaining");
const budgetProgressElement = document.getElementById("budget-progress");
const budgetStatusElement = document.getElementById("budget-status");

const addButton = document.getElementById("add-transaction");
const transactionForm = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");
const transactionFilter = document.getElementById("transaction-filter");
const transactionSearch = document.getElementById("transaction-search");

const transactionName = document.getElementById("transaction-name");
const transactionAmount = document.getElementById("transaction-amount");
const transactionDate = document.getElementById("transaction-date");
const transactionCategory = document.getElementById("transaction-category");
const transactionType = document.getElementById("transaction-type");

const categorySummaryList = document.getElementById("category-summary-list");

const chartIncomeElement = document.getElementById("chart-income");
const chartExpenseElement = document.getElementById("chart-expense");
const incomeBar = document.getElementById("income-bar");
const expenseBar = document.getElementById("expense-bar");

let transactions = loadTransactions();
let editingTransactionId = null;

// Format angka menjadi mata uang Rupiah.
function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(amount);
}

// Mengambil tanggal lokal agar tidak bergeser karena zona waktu.
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Membaca data transaksi dari localStorage.
function loadTransactions() {
    try {
        const savedTransactions = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(savedTransactions)) {
            return [];
        }

        return savedTransactions
            .filter(item =>
                item &&
                typeof item === "object" &&
                typeof item.name === "string" &&
                Number.isFinite(Number(item.amount)) &&
                Number(item.amount) > 0 &&
                ["income", "expense"].includes(item.type)
            )
            .map(item => ({
                ...item,
                id: item.id ?? `${Date.now()}-${Math.random()}`,
                amount: Number(item.amount),
                date: item.date || getLocalDateString(),
                category: item.category || "Lainnya"
            }));
    } catch (error) {
        console.error("Gagal membaca data transaksi:", error);
        return [];
    }
}

// Menyimpan transaksi.
function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );
        return true;
    } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);
        alert("Data gagal disimpan. Periksa penyimpanan browser.");
        return false;
    }
}

// Mengambil data budget.
function loadBudget() {
    try {
        const budget = Number(localStorage.getItem(BUDGET_KEY));
        return Number.isFinite(budget) && budget > 0 ? budget : 0;
    } catch (error) {
        console.error("Gagal membaca budget:", error);
        return 0;
    }
}

let monthlyBudget = loadBudget();

// Memeriksa apakah transaksi berada pada bulan dan tahun ini.
function isCurrentMonth(dateString) {
    if (!dateString) return false;

    const date = new Date(`${dateString}T12:00:00`);
    const now = new Date();

    return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    );
}

// Menghitung total pemasukan, pengeluaran, dan saldo.
function updateDashboard() {
    const totalIncome = transactions
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const totalExpense = transactions
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    balanceElement.textContent = formatRupiah(
        totalIncome - totalExpense
    );

    incomeElement.textContent = formatRupiah(totalIncome);
    expenseElement.textContent = formatRupiah(totalExpense);

    renderTransactions();
    renderCategorySummary();
    updateMonthlyBudget();
    updateFinanceChart();
}

// Menampilkan daftar transaksi berdasarkan pencarian dan filter.
function renderTransactions() {
    const filterValue = transactionFilter.value;
    const searchValue = transactionSearch.value
        .trim()
        .toLowerCase();

    const filteredTransactions = transactions
        .filter(item => {
            const matchesType =
                filterValue === "all" || item.type === filterValue;

            const matchesSearch =
                item.name.toLowerCase().includes(searchValue) ||
                item.category.toLowerCase().includes(searchValue);

            return matchesType && matchesSearch;
        })
        .sort((a, b) => {
            const dateComparison = b.date.localeCompare(a.date);

            if (dateComparison !== 0) return dateComparison;

            return String(b.id).localeCompare(String(a.id));
        });

    transactionList.replaceChildren();

    if (filteredTransactions.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "↗";

        const heading = document.createElement("h3");
        heading.textContent = transactions.length === 0
            ? "Belum ada transaksi"
            : "Transaksi tidak ditemukan";

        const description = document.createElement("p");
        description.textContent = transactions.length === 0
            ? "Tambahkan transaksi pertamamu untuk mulai mencatat keuangan."
            : "Coba kata kunci atau filter yang berbeda.";

        emptyState.append(icon, heading, description);
        transactionList.appendChild(emptyState);
        return;
    }

    filteredTransactions.forEach(item => {
        const row = document.createElement("article");
        row.className = "transaction-item";

        const info = document.createElement("div");
        info.className = "transaction-info";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const details = document.createElement("p");
        details.textContent =
            `${item.category} · ${formatDisplayDate(item.date)}`;

        info.append(name, details);

        const amount = document.createElement("p");
        amount.className = "transaction-amount";
        amount.textContent =
            `${item.type === "income" ? "+" : "-"}${formatRupiah(item.amount)}`;
        amount.classList.add(
            item.type === "income" ? "income-text" : "expense-text"
        );

        const actions = document.createElement("div");
        actions.className = "transaction-item-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "edit-transaction";
        editButton.addEventListener("click", () => {
            editTransaction(item.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Hapus";
        deleteButton.className = "delete-transaction";
        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id);
        });

        actions.append(editButton, deleteButton);
        row.append(info, amount, actions);
        transactionList.appendChild(row);
    });
}

// Format tanggal untuk daftar transaksi.
function formatDisplayDate(dateString) {
    if (!dateString) return "-";

    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

// Membuka form transaksi baru.
addButton.addEventListener("click", () => {
    if (transactionForm.hidden) {
        resetTransactionForm();
        transactionForm.hidden = false;
        addButton.textContent = "Tutup Form";
        transactionName.focus();
    } else {
        resetTransactionForm();
    }
});

// Mengembalikan form ke kondisi awal.
function resetTransactionForm() {
    transactionForm.reset();
    editingTransactionId = null;
    transactionDate.value = getLocalDateString();
    transactionForm.hidden = true;
    addButton.textContent = "+ Tambah Transaksi";

    const submitButton = transactionForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.textContent = "Simpan Transaksi";
    }
}

// Menambah atau memperbarui transaksi.
transactionForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = transactionName.value.trim();
    const amount = Number(transactionAmount.value);
    const date = transactionDate.value;
    const category = transactionCategory.value;
    const type = transactionType.value;

    if (
        !name ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        !category ||
        !["income", "expense"].includes(type)
    ) {
        alert("Periksa kembali data transaksi yang kamu masukkan.");
        return;
    }

    const transactionData = {
        name,
        amount,
        date,
        category,
        type
    };

    if (editingTransactionId !== null) {
        transactions = transactions.map(item =>
            String(item.id) === String(editingTransactionId)
                ? { ...item, ...transactionData }
                : item
        );
    } else {
        transactions.push({
            id: `${Date.now()}-${Math.random()}`,
            ...transactionData
        });
    }

    if (!saveTransactions()) return;

    resetTransactionForm();
    updateDashboard();
});

// Mengisi form untuk mengedit transaksi.
function editTransaction(id) {
    const item = transactions.find(
        transaction => String(transaction.id) === String(id)
    );

    if (!item) return;

    editingTransactionId = item.id;

    transactionName.value = item.name;
    transactionAmount.value = item.amount;
    transactionDate.value = item.date;
    transactionCategory.value = item.category;
    transactionType.value = item.type;

    transactionForm.hidden = false;
    addButton.textContent = "Tutup Form";

    const submitButton = transactionForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.textContent = "Simpan Perubahan";
    }

    transactionForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    transactionName.focus();
}

// Menghapus transaksi.
function deleteTransaction(id) {
    const item = transactions.find(
        transaction => String(transaction.id) === String(id)
    );

    if (!item) return;

    const confirmed = confirm(
        `Hapus transaksi "${item.name}"?`
    );

    if (!confirmed) return;

    const previousTransactions = transactions;

    transactions = transactions.filter(
        transaction => String(transaction.id) !== String(id)
    );

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    if (String(editingTransactionId) === String(id)) {
        resetTransactionForm();
    }

    updateDashboard();
}

// Filter dan pencarian transaksi.
transactionFilter.addEventListener("change", renderTransactions);
transactionSearch.addEventListener("input", renderTransactions);

// Menyimpan budget bulanan.
budgetForm.addEventListener("submit", event => {
    event.preventDefault();

    const budget = Number(monthlyBudgetInput.value);

    if (!Number.isFinite(budget) || budget <= 0) {
        alert("Masukkan budget bulanan yang lebih besar dari nol.");
        return;
    }

    try {
        localStorage.setItem(BUDGET_KEY, String(budget));
        monthlyBudget = budget;
        updateMonthlyBudget();
        alert("Budget bulanan berhasil disimpan.");
    } catch (error) {
        console.error("Gagal menyimpan budget:", error);
        alert("Budget gagal disimpan. Periksa penyimpanan browser.");
    }
});

// Menghitung budget dan persentase penggunaannya.
function updateMonthlyBudget() {
    const spent = transactions
        .filter(item =>
            item.type === "expense" && isCurrentMonth(item.date)
        )
        .reduce((total, item) => total + item.amount, 0);

    const remaining = monthlyBudget - spent;

    budgetLimitElement.textContent = formatRupiah(monthlyBudget);
    budgetSpentElement.textContent = formatRupiah(spent);
    budgetRemainingElement.textContent = formatRupiah(remaining);

    monthlyBudgetInput.value = monthlyBudget > 0
        ? monthlyBudget
        : "";

    const percentage = monthlyBudget > 0
        ? (spent / monthlyBudget) * 100
        : 0;

    budgetProgressElement.style.width =
        `${Math.min(percentage, 100)}%`;

    budgetProgressElement.style.backgroundColor =
        percentage >= 100 ? "#dc2626" :
        percentage >= 80 ? "#f59e0b" : "#2563eb";

    if (monthlyBudget <= 0) {
        budgetStatusElement.textContent =
            "Tentukan budget bulananmu untuk memulai.";
    } else if (percentage >= 100) {
        budgetStatusElement.textContent =
            "Budget terlampaui. Periksa kembali pengeluaranmu.";
    } else if (percentage >= 80) {
        budgetStatusElement.textContent =
            `Kamu sudah menggunakan ${percentage.toFixed(1)}% budget.`;
    } else {
        budgetStatusElement.textContent =
            `Budget terpakai ${percentage.toFixed(1)}%. Tetap pantau pengeluaranmu.`;
    }
}

// Membuat ringkasan pengeluaran berdasarkan kategori.
function renderCategorySummary() {
    const categoryTotals = {};

    transactions
        .filter(item => item.type === "expense")
        .forEach(item => {
            categoryTotals[item.category] =
                (categoryTotals[item.category] || 0) + item.amount;
        });

    const categories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

    const totalExpense = categories.reduce(
        (total, [, amount]) => total + amount,
        0
    );

    categorySummaryList.replaceChildren();

    if (categories.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Belum ada data pengeluaran per kategori.";
        categorySummaryList.appendChild(message);
        return;
    }

    categories.forEach(([category, amount]) => {
        const percentage = totalExpense > 0
            ? (amount / totalExpense) * 100
            : 0;

        const item = document.createElement("div");
        item.className = "category-summary-item";

        const header = document.createElement("div");
        header.className = "category-summary-header";

        const categoryName = document.createElement("span");
        categoryName.textContent = category;

        const categoryAmount = document.createElement("span");
        categoryAmount.textContent = formatRupiah(amount);

        header.append(categoryName, categoryAmount);

        const progressBar = document.createElement("div");
        progressBar.className = "category-progress-bar";

        const progress = document.createElement("div");
        progress.className = "category-progress";
        progress.style.width = `${percentage}%`;

        progressBar.appendChild(progress);

        const percentText = document.createElement("p");
        percentText.className = "category-percentage";

        const percentageLabel =
            percentage > 0 && percentage < 1
                ? "<1%"
                : `${Math.round(percentage)}%`;

        percentText.textContent =
            `${percentageLabel} dari pengeluaran`;

        item.append(header, progressBar, percentText);
        categorySummaryList.appendChild(item);
    });
}

// Memperbarui grafik pemasukan dan pengeluaran bulan ini.
function updateFinanceChart() {
    const currentMonthTransactions = transactions.filter(
        item => isCurrentMonth(item.date)
    );

    const currentIncome = currentMonthTransactions
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const currentExpense = currentMonthTransactions
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    chartIncomeElement.textContent = formatRupiah(currentIncome);
    chartExpenseElement.textContent = formatRupiah(currentExpense);

    const maximum = Math.max(currentIncome, currentExpense);

    const incomeHeight = maximum > 0
        ? (currentIncome / maximum) * 100
        : 0;

    const expenseHeight = maximum > 0
        ? (currentExpense / maximum) * 100
        : 0;

    incomeBar.style.height = `${incomeHeight}%`;
    expenseBar.style.height = `${expenseHeight}%`;

    incomeBar.title = `Pemasukan: ${formatRupiah(currentIncome)}`;
    expenseBar.title = `Pengeluaran: ${formatRupiah(currentExpense)}`;
}

// Inisialisasi aplikasi saat halaman dibuka.
transactionDate.value = getLocalDateString();
updateDashboard();
