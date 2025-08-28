// src/lib/Productive/productiveDataHelpers.ts

// Generic fetch function passed into these helpers
// fetchProductive should be your API client function for Productive.io

export async function fetchAllProductive(fetchProductive: any, endpoint: string, params: any) {
  let page = 1;
  const allData: any[] = [];

  while (true) {
    const resp = await fetchProductive(endpoint, {
      params: { ...params, 'page[number]': page, 'page[size]': 200 },
    });
    const data = resp?.data || [];
    allData.push(...data);
    if (data.length < 200) break;
    page++;
  }

  return allData;
}

export async function fetchAllWithIncluded(fetchProductive: any, endpoint: string, params: any) {
  let page = 1;
  const allData: any[] = [];
  const allIncluded: any[] = [];

  while (true) {
    const resp = await fetchProductive(endpoint, {
      params: { ...params, 'page[number]': page, 'page[size]': 200 },
    });
    const data = resp?.data ?? [];
    const included = resp?.included ?? [];
    allData.push(...data);
    allIncluded.push(...included);
    if (data.length < 200) break;
    page++;
  }

  return { data: allData, included: allIncluded };
}

export async function fetchAllWithIncludedSafe(fetchProductive: any, endpoint: string, params: any) {
  try {
    return await fetchAllWithIncluded(fetchProductive, endpoint, params);
  } catch (err: any) {
    const body = err?.response?.data ?? err;
    console.error('❌ Productive include fetch failed:', JSON.stringify(body, null, 2));
    throw err;
  }
}

export async function fetchAllTimeEntries(fetchProductive: any, startDate: string, endDate: string) {
  let allEntries: any[] = [];
  let page = 1;

  while (true) {
    const resp = await fetchProductive('/time_entries', {
      params: {
        'filter[date_gte]': startDate,
        'filter[date_lte]': endDate,
        'page[number]': page,
        'page[size]': 200,
      },
    });

    const data = resp?.data ?? [];
    allEntries.push(...data);

    if (data.length < 200) break;
    page++;
  }

  return allEntries;
}