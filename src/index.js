// src/index.js
const splitwiseService = require('./splitwiseService');
const actualBudgetService = require('./actualBudgetService');
const config = require('./config');

async function syncExpenses() {
  await actualBudgetService.initialize();

  // get start date from environment variable
  const startDate = Date.parse(process.env.START_DATE);
  const endDate = Date.now();
  let startDateString = new Date(startDate).toISOString();
  let endDateString = new Date(endDate).toISOString();

  // Fetch expenses from Splitwise
  console.log(`Fetching expenses between ${startDateString} and ${endDateString}`);
  const expenses = await splitwiseService.fetchExpensesBetweenDates(startDateString, endDateString);
  console.log(`Found ${expenses.length} expenses.`);

  accs = await actualBudgetService.fetchAccounts();

  // Fetch transactions from ActualBudget
  console.log(`Fetching transactions between ${startDateString} and ${endDateString}...`);
  // change datestring to actual date without time
  startDateString = new Date(startDate).toISOString().split('T')[0];
  endDateString = new Date(endDate).toISOString().split('T')[0];

  const transactions = await actualBudgetService.fetchTransactionsBetweenDates(startDateString, endDateString);
  console.log(`Found ${transactions.length} transactions.`);

  // distinguish between new and updated expenses
  const transactionNotesToImport = transactions.map((transaction) => transaction.notes);
  const newExpenses = [];
  const updatedExpenses = [];
  const updatedTransactionIds = [];

  for (const expense of expenses) {
    for (const user of expense.users) {
      if (user.user_id === config.splitWiseUserId) {
        continue;
      }

      const note = expense.description + ' (' + expense.id + '_' + user.user_id + ')';
      if (!transactionNotesToImport.includes(note)) {
        newExpenses.push(expense);
      } else {
        for (const transaction of transactions) {
          if (transaction.notes === note) {
            updatedExpenses.push(expense);
            updatedTransactionIds.push(transaction.id);
          }
        }
      }
    }
    console.log(`Found ${newExpenses.length} new expenses. Syncing with ActualBudget...`);
    const newTransactions = await mapExpensesToTransactions(newExpenses);
    await actualBudgetService.importTransactions(newTransactions);

    console.log(`Found ${updatedExpenses.length} updated expenses. Syncing with ActualBudget...`);
    const updatedTransactions = await mapExpensesToTransactions(updatedExpenses);
    await actualBudgetService.updateTransactions(updatedTransactionIds, updatedTransactions);

    console.log(`Successfully synced ${newTransactions.length} transactions.`);

    // change environment variable to current date
    process.env.START_DATE = endDateString;
  }
}

// function which turns expenses into transactions
async function mapExpensesToTransactions(expenses) {
  transactions = [];
  for (const expense of expenses) {
    for (const user of expense.users) {
      if (user.user_id === config.splitWiseUserId) {
        continue;
      }

      const transaction = {
        account: 'Splitwise',
        date: new Date(expense.date),
        amount: actualBudgetService.integerToAmount(expense.cost),
        payee: user.first_name,
        payee_name: user.first_name,
        imported_payee: user.first_name,
        notes: expense.description + ' (' + expense.id + '_' + user.user_id + ')',
      };
      transactions.push(transaction);
    }
  }

  return transactions
}

syncExpenses()
  .then(() => console.log('Sync complete'))
  .catch((error) => console.error('Sync failed:', error));
