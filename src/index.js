// src/index.js
const splitwiseService = require('./splitwiseService');
const actualBudgetService = require('./actualBudgetService');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const { group } = require('console');

async function syncExpenses() {
  await actualBudgetService.initialize();

  // load start date from 'last_sync.json' file into environment variable
  const lastSyncPath = path.join(__dirname, 'last_sync.json');
  if (fs.existsSync(lastSyncPath)) {
    const lastSync = JSON.parse(fs.readFileSync(lastSyncPath));
    process.env.START_DATE = lastSync.startDate;
  }

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

    // key to identify expense
    const key = expense.id.toString();

    // expense was deleted on splitwise
    if (expense.deleted_at !== null) {
      for (const transaction of transactions) {
        if (transaction.imported_id === key) {
          deletedTransactionIds.push(transaction.id);
        }
      }
    } else {
      // expense is not new
      found = false;
      for (const transaction of transactions) {
        if (transaction.imported_id === key) {
          let updatedTransaction = await expenseToTransaction(expense);

          if (updatedTransaction !== null) {
            updatedTransactions.push(updatedTransaction);
            updatedTransactionIds.push(transaction.id);
          }
          found = true;
          break;
        }
      }

      // expense is new
      if (!found) {
        let newTransaction = await expenseToTransaction(expense);

        if (newTransaction !== null) {
          newTransactions.push(newTransaction);
        } else {
          //console.log(`Skipping expense with description ${expense.description} and date ${expense.date} as it does not involve user with id ${config.splitWiseUserId}`);
        }
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
    await actualBudgetService.deleteTransactions(updatedTransactionIds);
    await actualBudgetService.importTransactions(updatedTransactions);
  }
  // delete transactions in ActualBudget
  console.log(`Found ${deletedTransactionIds.length} deleted expenses. Syncing with ActualBudget...`);
  if (deletedTransactionIds.length > 0) {
    await actualBudgetService.deleteTransactions(deletedTransactionIds);
  }

  // log the number of expenses the user is not involved in
  console.log(`Found ${expenses.length -deletedTransactionIds.length - newTransactions.length - updatedTransactions.length} expenses that do not involve user with id ${config.splitWiseUserId}`);
  
  // save end date to 'last_sync.json' file
  const lastSync = { startDate: endDateString };
  fs.writeFileSync(lastSyncPath, JSON.stringify(lastSync));


  // wait for ActualBudget to finish processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // shutdown ActualBudget
  await actualBudgetService.shutdown();

  // log success
  console.log('Sync complete');
}

async function expenseToTransaction(expense) {

  let group = null;
  if(expense.group_id !== null) {
    groups = await splitwiseService.fetchGroups();

    for (grp of groups) {
      if (grp.id === expense.group_id) {
        group = grp;
        break;
      }
    }

  }

  let payee_str = "";
  let amount = 0;
  let main_user = null;
  // extract net balance for user and set 
  for (exp_user of expense.users) {
    if (exp_user.user_id === parseInt(config.splitWiseUserId)) {
      amount = actualBudgetService.integerToAmount(exp_user.net_balance);
      main_user = exp_user.user;
    }
  }

  if (amount === 0) {
    return null;
  }

  // get all users with net balance opposite to user
  let relevant_users = [];
  for (exp_user of expense.users) {
    if (exp_user.user_id === parseInt(config.splitWiseUserId)) {
      continue;
    }

    if (amount > 0 && exp_user.net_balance < 0) {
      relevant_users.push(exp_user.user);
    } else if (amount < 0 && exp_user.net_balance > 0) {
      relevant_users.push(exp_user.user);
    }
  }

  // for each relevant user, add to payee string
  if (relevant_users.length === 1 && relevant_users[0].last_name !== null) {
    payee_str = relevant_users[0].first_name + ' ' + relevant_users[0].last_name;
  } else if (relevant_users.length === 1) {
    payee_str = relevant_users[0].first_name;
  } else {
    for (user of relevant_users) {
      payee_str += user.first_name + ", ";
    }
    payee_str = payee_str.slice(0, -2);
  }

  // get payees
  payees = await actualBudgetService.fetchPayees();

  // check if payee exists in ActualBudget
  let payee_id = null;
  for (payee of payees) {
    if (payee.name === payee_str) {
      payee_id = payee.id;
      break;
    }
  }

  // create payee if it does not exist
  if (payee_id === null) {
    payee_id = await actualBudgetService.createPayee({ name: payee_str });
  }

  let category = null;
  if (expense.description == 'Payment') {

    category = config.actualBudgetToBeBudgettedCategoryId;
  }

  if (group !== null && group.name !== "Non-group expenses") {
    notes_str = group.name + ": " + expense.description;
  } else {
    notes_str = expense.description;
  }

  let subtransactions = [];

  if(group !== null && group.name === "Billbuddy") {

    // parse splitwise comments and look for "Totals for user"
    comments = await splitwiseService.fetchComments(expense);
    for (comment of comments) {
      if (comment.content.includes("Totals for Michiel")) {
        // parse comment and extract category
        let lines = comment.content.split('\n');
        recording = false;
        for (line of lines) {
          if (line.includes("Totals for " + main_user.first_name)) {
            recording = true;
          } else if (recording) {
            if (line.includes("Total")) {
              recording = false;
            } else {
              let parts = line.split(': ');
              let cat = parts[0];
              let part_amount = parseFloat(parts[1]);
              if (part_amount > 0) {
                let categ = await billBuddyToActualBudgetCategories(cat);

                if (cat == "discount") {
                  part_amount = actualBudgetService.integerToAmount(part_amount);
                } else {
                  part_amount = -actualBudgetService.integerToAmount(part_amount);
                }

                subtransactions.push({
                  amount: part_amount,
                  category: categ,
                });
              }  
            }
          }
        }
      }
    }

  } 

  if (subtransactions.length > 0) {
    return {
      account: 'Splitwise',
      date: new Date(expense.date),
      amount: amount,
      payee: payee_id,
      payee_name: payee_id,
      imported_payee: payee_id,
      category: category,
      imported_id: expense.id.toString(),
      cleared: true,
      notes: notes_str,
      subtransactions: subtransactions,
    };
  } else {
    return {
      account: 'Splitwise',
      date: new Date(expense.date),
      amount: amount,
      payee: payee_id,
      payee_name: payee_id,
      imported_payee: payee_id,
      category: category,
      imported_id: expense.id.toString(),
      cleared: true,
      notes: notes_str,
    };
  }



}

async function billBuddyToActualBudgetCategories(cat) {
  // first retrieve categories from ActualBudget
  cats = await actualBudgetService.fetchCategories();

  // check if lowercase category exists in lowercase ActualBudget categories
  for (category of cats) {
    if (category.name.toLowerCase() === cat.toLowerCase()) {
      return category.id;
    } else if (category.name.toLowerCase() === "general" && cat.toLowerCase() === "product") {
      return category.id;
    }
  }

  return null;
}

syncExpenses()
  .then(() => console.log('Sync complete'))
  .catch((error) => console.error('Sync failed:', error));
