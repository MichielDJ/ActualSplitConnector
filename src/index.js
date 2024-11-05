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

  // Fetch accounts from ActualBudget
  accs = await actualBudgetService.fetchAccounts();
  console.log(`Found ${accs.length} accounts.`);

  // Fetch categories from ActualBudget
  cats = await actualBudgetService.fetchCategories();
  console.log(`Found ${cats.length} categories.`);

  // Fetch transactions from ActualBudget
  console.log(`Fetching transactions between ${startDateString} and ${endDateString}...`);
  startDateStringParsed = new Date(startDate).toISOString().split('T')[0];
  endDateStringParsed = new Date(endDate).toISOString().split('T')[0];

  const transactions = await actualBudgetService.fetchTransactionsBetweenDates(startDateStringParsed, endDateStringParsed);
  console.log(`Found ${transactions.length} transactions.`);

  // distinguish between new and updated expenses
  const newTransactions = [];
  const updatedTransactions = [];
  const updatedTransactionIds = [];
  const deletedTransactionIds = [];

  for (const expense of expenses) {
    for (const user of expense.users) {
      if (user.user_id === parseInt(config.splitWiseUserId)) {
        continue;
      }

      // key to find transactions in ActualBudget corresponding to Splitwise expense
      const key = expense.id + '_' + user.user_id;

      // expense was deleted on splitwise
      if (expense.deleted_at !== null) {
        for (const transaction of transactions) {
          if (transaction.imported_id === key) {
            deletedTransactionIds.push(transaction.id);
          }
        }
        continue;
      }

      // expense, user combination is not new
      found = false;
      for (const transaction of transactions) {
        if (transaction.imported_id === key) {
          updatedTransactionIds.push(transaction.id);
          updatedTransactions.push(expenseAndUserToTransaction(expense, user.user));
          found = true;
          break;
        }
      }

      // expense, user combination is new
      if (!found) {
        newTransactions.push(expenseAndUserToTransaction(expense, user.user));
      }
    }
  }

  // push new transactions to ActualBudget
  console.log(`Found ${newTransactions.length} new expenses. Syncing with ActualBudget...`);
  if (newTransactions.length > 0) {
    await actualBudgetService.importTransactions(newTransactions);
  }

  // update transactions in ActualBudget
  console.log(`Found ${updatedTransactions.length} updated expenses. Syncing with ActualBudget...`);
  if (updatedTransactions.length > 0) {
    await actualBudgetService.updateTransactions(updatedTransactionIds, updatedTransactions);
  }
  // delete transactions in ActualBudget
  console.log(`Found ${deletedTransactionIds.length} deleted expenses. Syncing with ActualBudget...`);
  if (deletedTransactionIds.length > 0) {
    await actualBudgetService.deleteTransactions(deletedTransactionIds);
  }
  
  // change environment variable to current date
  process.env.START_DATE = endDateString;

  // shutdown ActualBudget
  await actualBudgetService.shutdown();

  // log success
  console.log('Sync complete');
}


async function expenseToTransactions(expense) {
  transactions = []
  for (const user of expense.users) {
    if (user.user_id === int(config.splitWiseUserId)) {
      continue;
    }

    const transaction = await expenseAndUserToTransaction(expense, user.user);
    transactions.push(transaction);
  }

  return transactions;
}

function expenseAndUserToTransaction(expense, user) {
  let name_str = '';
  if(user.last_name != null){
    name_str = user.first_name + ' ' + user.last_name;
  } else {
    name_str = user.first_name;
  }

  let category = null;
  let amount = actualBudgetService.integerToAmount(expense.cost);
  if (expense.description == 'Payment') {
    category = config.actualBudgetToBeBudgettedCategoryId;
    amount = -amount;
  }

  return {
    account: 'Splitwise',
    date: new Date(expense.date),
    amount: amount,
    payee: name_str,
    payee_name: name_str,
    imported_payee: name_str,
    category: category,
    imported_id: expense.id + '_' + user.id,
    cleared: true,
    notes: expense.description,
  };
}

syncExpenses()
  .then(() => console.log('Sync complete'))
  .catch((error) => console.error('Sync failed:', error));
