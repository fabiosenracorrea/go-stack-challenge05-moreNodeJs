import fs from 'fs';
import csvtojson from 'csvtojson';
import path from 'path';

import uploadConfig from '../config/upload';

import CreateTransactionService from './CreateTransactionService';

import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';

class ImportTransactionsService {
  async execute(filename: string, type: string): Promise<Transaction[]> {
    const fileUploaded = path.join(uploadConfig.directory, filename);

    if (type !== 'text/csv') {
      await fs.promises.unlink(fileUploaded);
      throw new AppError('Incorrect file type.');
    }

    // solution find on https://stackoverflow.com/a/52199182/14115629
    const transactions = await csvtojson({
      trim: true,
    }).fromFile(fileUploaded);

    const incomeTransactions = transactions.filter(
      trans => trans.type === 'income',
    );
    const outcomeTransactions = transactions.filter(
      trans => trans.type === 'outcome',
    );

    const createTransactionService = new CreateTransactionService();

    const savedIncomeTransactions = await Promise.all(
      incomeTransactions.map(async transaction => {
        const savedTransaction = await createTransactionService.execute(
          transaction,
        );

        return savedTransaction;
      }),
    );

    const savedOutcomeTransactions = await Promise.all(
      outcomeTransactions.map(async transaction => {
        const savedTransaction = await createTransactionService.execute(
          transaction,
        );

        return savedTransaction;
      }),
    );

    await fs.promises.unlink(fileUploaded);

    const savedTransactions = savedIncomeTransactions.concat(
      savedOutcomeTransactions,
    );

    return savedTransactions;
  }
}

export default ImportTransactionsService;
