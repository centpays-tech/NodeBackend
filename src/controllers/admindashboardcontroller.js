require("../config/database");
const LiveTransactionTable = require("../models/LiveTransactionTable");

const AdminsuccessPercentageToday = async (req, res) => {
  const { currency, merchant } = req.query;
  try {
    console.log("In today stats")
    const currentDate = new Date();
    console.log(currentDate)

    const fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0).toISOString();
    const toDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();
    console.log(fromDate);
    console.log(toDate)

    const query = {
      transactiondate: { $gte: fromDate, $lte: toDate },
      currency: currency,
    };

    if (merchant) {
      query.merchant = merchant;
    }

    const aggregationPipeline = [
      {
        $match: query,
      },
      {
        $group: {
          _id: "$Status",
          count: { $sum: 1 },
          totalAmount: { $sum: { $cond: [{ $eq: ["$Status", "Success"] }, "$amount", 0] } }
        }
      }
    ];

    const resultsForDay = await LiveTransactionTable.aggregate(aggregationPipeline);
    console.log(resultsForDay)
    const successResult = resultsForDay.find(result => result._id === "Success") || { count: 0, totalAmount: 0 };
    const failedResult = resultsForDay.find(result => result._id === "Failed") || { count: 0 };
    const incompleteResult = resultsForDay.find(result => result._id === "Incompleted") || { count: 0 };

    const successCount = successResult.count;
    const failedCount = failedResult.count;
    const incompleteCount = incompleteResult.count;

    const successAmount = successResult.totalAmount;

    const totalTransactions = successCount + failedCount + incompleteCount;

    const successPercentage = totalTransactions === 0 ? 0 : (successCount / totalTransactions) * 100;

    res.status(200).json({
      successPercentage: 12,
      successAmount: 34,
      totalTransactions: 56,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const AdminweeklyStats = async (req, res) => {
  const { currency, merchant } = req.query;
  try {
    const currentDate = new Date();
    const results = [];
    const transactionCounts = [];
    let successThisWeek = 0;
    let failedThisWeek = 0;
    let incompleteThisWeek=0;
    let currentWeekSuccessTotalCount = 0
    let totalNumTxn = 0;

    const oneDayMilliseconds = 24 * 60 * 60 * 1000; 

    for (let i = 0; i < 7; i++) {
  const dayDate = new Date(currentDate.getTime() - i * oneDayMilliseconds);

  const fromDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).toISOString();
  const toDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59).toISOString();
console.log(fromDate)
console.log(toDate)

      const query = {
        transactiondate: { $gte: fromDate, $lte: toDate },
        currency: currency
      };
      if (merchant) {
        query.merchant = merchant;
      }

      const aggregationPipeline = [
        { $match: query },
        {$group: { 
          _id: "$Status", 
          count: { $sum: 1 }, 
          totalAmount: { $sum: "$amount" } 
        } }
      ];

      const resultsForDay = await LiveTransactionTable.aggregate(aggregationPipeline);
      const successResult = resultsForDay.find(result => result._id === "Success");
      const failedResult = resultsForDay.find(result => result._id === "Failed");
      const incompleteResult = resultsForDay.find(result => result._id === "Incompleted");

      const successCount = successResult ? successResult.count : 0;
      const failedCount = failedResult ? failedResult.count : 0;
      const incompleteCount = incompleteResult ? incompleteResult.count : 0;

      const successAmount = successResult ? successResult.totalAmount : 0;
      const failedAmount = failedResult ? failedResult.totalAmount : 0;
      const incompleteAmount = incompleteResult ? incompleteResult.totalAmount : 0;

      const dayFormatted = dayDate.toLocaleDateString("en-US");

      results.push({
        date: dayFormatted,
        successCount,
        failedCount,
        incompleteCount
      });
      transactionCounts.push({
        date: dayFormatted,
        totalCount: successCount + failedCount + incompleteCount
      })
      currentWeekSuccessTotalCount += successCount

      successThisWeek += successAmount;
      failedThisWeek += failedAmount;
      incompleteThisWeek += incompleteAmount;

      totalThisWeek = successThisWeek + failedThisWeek + incompleteThisWeek ;
      totalNumTxn += successCount + failedCount + incompleteCount
    }

    const previousweekstartDate = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousweekendDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const fromDate = new Date(previousweekstartDate.getFullYear(), previousweekstartDate.getMonth(), previousweekstartDate.getDate(), 0, 0, 0).toISOString();
  const toDate = new Date(previousweekendDate.getFullYear(), previousweekendDate.getMonth(), previousweekendDate.getDate(), 23, 59, 59).toISOString();
console.log("previous", fromDate.toLocaleString());
console.log(toDate)
  const query = {
    transactiondate: { $gte: fromDate, $lte: toDate },
    Status: "Success",
    currency: currency
  };

  if (merchant) {
    query.merchant = merchant;
  }
  
  const aggregationPipeline = [
    { $match: query },
    { 
      $group: { 
        _id: null, 
        count: { $sum: 1 }
      } 
    }
  ];
  
  const previousresults = await LiveTransactionTable.aggregate(aggregationPipeline);
console.log("previous",previousresults)
  const previousWeekSuccessTotalCount = previousresults.length > 0 ? previousresults[0].count : 0;
  console.log(currentWeekSuccessTotalCount);
  console.log(previousWeekSuccessTotalCount)
    let percentageChange;
    if (previousWeekSuccessTotalCount !== 0) {
      percentageChange =
        ((currentWeekSuccessTotalCount - previousWeekSuccessTotalCount) /
          (previousWeekSuccessTotalCount)) *
        100;
    } else {
      percentageChange = 100;
    }

    res.status(200).json({
      results,
      successThisWeek: parseFloat(successThisWeek.toFixed(3)),
      failedThisWeek: parseFloat(failedThisWeek.toFixed(3)),
      totalThisWeek: parseFloat(totalThisWeek.toFixed(3)),
      transactionCounts,
      totalNumTxn,
      percentageChange : parseFloat(percentageChange.toFixed(3))
    });
  } catch (error) {
    console.error("Error calculating past seven days counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const AdminweeklyCardComparison = async (req, res) => {
  const { currency, merchant } = req.query;
  try {
    const currentDate = new Date();
    const currentWeekStartDate = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);

    const previousweekstartDate = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousweekendDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formattedCurrentWeekStartDate = new Date(currentWeekStartDate.getFullYear(), currentWeekStartDate.getMonth(), currentWeekStartDate.getDate(), 0, 0, 0).toISOString();
    
    const formattedCurrentWeekEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();

    console.log(formattedCurrentWeekStartDate)
    console.log(formattedCurrentWeekEndDate)

    const formattedPreviousWeekStartDate = new Date(currentWeekStartDate.getFullYear(), currentWeekStartDate.getMonth(), previousweekstartDate.getDate(), 0, 0, 0).toISOString();

    const formattedPreviousWeekEndDate = new Date(previousweekendDate.getFullYear(), previousweekendDate.getMonth(), previousweekendDate.getDate(), 23, 59, 59).toISOString();

    console.log(formattedPreviousWeekStartDate)
    console.log(formattedPreviousWeekEndDate)

    query = {
      transactiondate: { $gte: formattedCurrentWeekStartDate, $lte: formattedCurrentWeekEndDate },
      currency: currency
    };
    if (merchant) {
      query.merchant = merchant;
    }

    aggregationPipeline = [
      { $match: query },
      {$group: { 
        _id: "$cardtype", 
        totalAmount: { $sum: "$amount" } 
      } }
    ];

    const resultsForCurrent = await LiveTransactionTable.aggregate(aggregationPipeline);
    console.log(resultsForCurrent)
    const CurrentvisaResult = resultsForCurrent.find(result => result._id === "Visa");
    const CurrentmastercardResult = resultsForCurrent.find(result => result._id === "Mastercard");

    const currentWeekVisaAmount = CurrentvisaResult ? CurrentvisaResult.totalAmount : 0;
    const currentWeekMastercardAmount = CurrentmastercardResult ? CurrentmastercardResult.totalAmount : 0;

    queryPrevious = {
      transactiondate: { $gte: formattedPreviousWeekStartDate, $lte: formattedPreviousWeekEndDate},
      currency: currency
    };
    if (merchant) {
      queryPrevious.merchant = merchant;
    }

    aggregationPipeline = [
      { $match: queryPrevious },
      {$group: { 
        _id: "$cardtype", 
        totalAmount: { $sum: "$amount" } 
      } }
    ];

    const resultsForPrevious = await LiveTransactionTable.aggregate(aggregationPipeline);
    console.log(resultsForPrevious)
    
    const PreviousvisaResult = resultsForPrevious.find(result => result._id === "Visa");
    const PreviousmastercardResult = resultsForPrevious.find(result => result._id === "Mastercard");

    const PreviousWeekVisaAmount = PreviousvisaResult ? PreviousvisaResult.totalAmount : 0;
    const PreviousWeekMastercardAmount = PreviousmastercardResult ? PreviousmastercardResult.totalAmount : 0;

    const visaDifference = parseFloat(
      (currentWeekVisaAmount - PreviousWeekVisaAmount).toFixed(3)
    );
    const mastercardDifference = parseFloat(
      (currentWeekMastercardAmount - PreviousWeekMastercardAmount).toFixed(3)
    );

    res.status(200).json({ visaDifference: parseFloat(visaDifference.toFixed(3)), mastercardDifference: parseFloat(mastercardDifference.toFixed(3)) });
  } catch (error) {
    console.error("Error calculating card transaction difference:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const AdminweeklyTop4Countries = async (req, res) => {
  const { currency, merchant } = req.query;
  try {
    const currentDate = new Date();
    const currentWeekStartDate = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);

    const formattedCurrentWeekStartDate = new Date(currentWeekStartDate.getFullYear(), currentWeekStartDate.getMonth(), currentWeekStartDate.getDate(), 0, 0, 0).toISOString();
    
    const formattedCurrentWeekEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();

    console.log(formattedCurrentWeekStartDate)
    console.log(formattedCurrentWeekEndDate)

    const aggregationPipeline = [
      {
        $match: {
          transactiondate: {
            $gte: formattedCurrentWeekStartDate ,
            $lte: formattedCurrentWeekEndDate,
          },
          currency: currency,
          merchant: merchant || { $exists: true }, 
          country: { $ne: "0" }, 
        },
      },
      {
        $group: {
          _id: "$country",
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: { transactionCount: -1 },
      },
      {
        $limit: 4,
      },
    ];

    const results = await LiveTransactionTable.aggregate(aggregationPipeline);

    res.status(200).json({
      topCountries: results,
    });
  } catch (error) {
    console.error("Error calculating top 4 country stats for the week:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const AdminmonthlyTransactionMetrics = async (req, res) => {
  const { currency, merchant } = req.query;
  try {

        const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate);
thirtyDaysAgo.setDate(currentDate.getDate() - 30);

if (thirtyDaysAgo.getMonth() === 11 && currentDate.getMonth() === 0) {
  thirtyDaysAgo.setFullYear(currentDate.getFullYear() - 1);
}

    let formattedFromDate = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0).toISOString();

    let formattedToDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();
console.log(formattedFromDate)
console.log(formattedToDate)

let pipeline = [
    {
      $match: {
        transactiondate: {
          $gte: formattedFromDate,
          $lte: formattedToDate,
        },
        currency,
        merchant: merchant || { $exists: true }, 
      },
    },
    {
      $group: {
        _id: null,
        numTransactions: { $sum: 1 },
        totalAmountTransactions: { $sum: "$amount" },
        numSuccessfulTransactions: {
          $sum: { $cond: { if: { $eq: ["$Status", "Success"] }, then: 1, else: 0 } },
        },
        totalAmountSuccessfulTransactions: {
          $sum: { $cond: { if: { $eq: ["$Status", "Success"] }, then: "$amount", else: 0 } },
        },
      },
    }]
  
    const result = await LiveTransactionTable.aggregate(pipeline);
    console.log(result)
  
    const {numTransactions,
        numSuccessfulTransactions,
        totalAmountTransactions,
        totalAmountSuccessfulTransactions} = result[0]

    const sixtyDaysAgo = new Date(thirtyDaysAgo);
      sixtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (sixtyDaysAgo.getMonth() === 11 && thirtyDaysAgo.getMonth() === 0) {
    sixtyDaysAgo.setFullYear(thirtyDaysAgo.getFullYear() - 1);
  }
  console.log(sixtyDaysAgo)
    
  formattedFromDate = new Date(sixtyDaysAgo.getFullYear(), sixtyDaysAgo.getMonth(), sixtyDaysAgo.getDate(), 0, 0, 0).toISOString();

  formattedToDate = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 23, 59, 59).toISOString();
console.log(formattedFromDate)
console.log(formattedToDate)
pipeline = [
{
  $match: {
    transactiondate: {
      $gte: formattedFromDate,
      $lte: formattedToDate,
    },
    currency,
    merchant: merchant || { $exists: true }, 
  },
},
{
  $group: {
    _id: null,
    numSuccessfulTransactionsPreviousMonth: {
      $sum: { $cond: { if: { $eq: ["$Status", "Success"] }, then: 1, else: 0 } },
    }
  },
}]

const previousresult = await LiveTransactionTable.aggregate(pipeline);
console.log(previousresult)

const numSuccessfulTransactionsPreviousMonth = previousresult.length > 0 ? previousresult[0].numSuccessfulTransactionsPreviousMonth : 0

console.log(numSuccessfulTransactionsPreviousMonth)
    
const growthPercentage =
      numSuccessfulTransactionsPreviousMonth === 0
        ? 100
        : ((numSuccessfulTransactions - numSuccessfulTransactionsPreviousMonth) /
            numSuccessfulTransactionsPreviousMonth) *
          100;

          res.status(200).json({
                  numTransactions,
                  numSuccessfulTransactions,
                  totalAmountTransactions,
                  totalAmountSuccessfulTransactions,
                  growthPercentage,
                });
  } catch (error) {
    console.error("Error calculating last 30 days stats using aggregation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const Adminsuccesslast6Months = async (req, res) => {
  const { currency, merchant } = req.query;
  try {
    const currentDate = new Date();
    console.log(currentDate)
    let startMonth = currentDate.getMonth() - 5;
    let startYear = currentDate.getFullYear();
    if (startMonth < 0) {
      startMonth += 12;
      startYear--;
    }
    const endMonth = currentDate.getMonth()+1;
    const endYear = currentDate.getFullYear();

    const MonthfromDate = new Date(startYear, startMonth, 1, 0, 0, 0).toISOString();
    const MonthtoDate = new Date(endYear, endMonth, 0, 23, 59, 59).toISOString();
    console.log(MonthfromDate)
    console.log(MonthtoDate)
    
    const pipeline = [
        {
        $match: {
          Status: "Success",
          currency: currency,
          ...(merchant && { merchant: merchant }),
          transactiondate: {
            $gte: MonthfromDate,
            $lte: MonthtoDate
          }
        }
      },
      {
        $group: {
          _id: {month: { $month: { $toDate: "$transactiondate" } },
            year: { $year: { $toDate: "$transactiondate" } }
          },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          totalAmount: 1
        }
      }
    ];

    const result = await LiveTransactionTable.aggregate(pipeline);
console.log(result)
    const salesByMonth = {};
    let totalSales = 0;

    // Initialize salesByMonth with 0 values for all 6 months
    for (let i = 0; i < 6; i++) {
      let month = startMonth + i;
      let year = startYear;
      if (month > 11) {
        month -= 12;
        year++;
      }
      salesByMonth[`${month + 1}/${year}`] = 0;
    }

    result.forEach(({ month, year, totalAmount }) => {
      salesByMonth[`${month}/${year}`] = totalAmount;
      totalSales += totalAmount;
    });

    res.json({ salesByMonth, totalSales });
  } catch (error) {
    console.error("Error fetching data using aggregation:", error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
};


module.exports = {
  AdminsuccessPercentageToday,
  AdminweeklyStats,
  AdminweeklyCardComparison,
  AdminweeklyTop4Countries,
  Adminsuccesslast6Months,
  AdminmonthlyTransactionMetrics,
};
