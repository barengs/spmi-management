import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    units: [],
    loading: true,
    loadingRequirements: false,
    viewMode: 'pairs',
    selectedFaculty: null,
    selectedProdi: null,
    activeRequirementTab: 'DEKAN',
    pairsPage: 1,
    requirementsPage: 1,
    pairsSearch: '',
    pairsFacultyFilter: 'ALL',
    requirementsSearch: '',
    requirementsStandardFilter: 'ALL',
    requirementRows: [],
    isAddModalOpen: false,
    allIndicators: [],
    loadingIndicators: false,
    indicatorSearch: '',
    selectedIndicatorId: '',
    selectedPj: 'Kaprodi',
};

const borangSlice = createSlice({
    name: 'borang',
    initialState,
    reducers: {
        setUnits: (state, action) => {
            state.units = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setLoadingRequirements: (state, action) => {
            state.loadingRequirements = action.payload;
        },
        setViewMode: (state, action) => {
            state.viewMode = action.payload;
        },
        setSelectedFaculty: (state, action) => {
            state.selectedFaculty = action.payload;
        },
        setSelectedProdi: (state, action) => {
            state.selectedProdi = action.payload;
        },
        setActiveRequirementTab: (state, action) => {
            state.activeRequirementTab = action.payload;
        },
        setPairsPage: (state, action) => {
            state.pairsPage = action.payload;
        },
        setRequirementsPage: (state, action) => {
            state.requirementsPage = action.payload;
        },
        setPairsSearch: (state, action) => {
            state.pairsSearch = action.payload;
        },
        setPairsFacultyFilter: (state, action) => {
            state.pairsFacultyFilter = action.payload;
        },
        setRequirementsSearch: (state, action) => {
            state.requirementsSearch = action.payload;
        },
        setRequirementsStandardFilter: (state, action) => {
            state.requirementsStandardFilter = action.payload;
        },
        setRequirementRows: (state, action) => {
            state.requirementRows = action.payload;
        },
        addRequirementRow: (state, action) => {
            state.requirementRows.push(action.payload);
        },
        removeRequirementRow: (state, action) => {
            state.requirementRows = state.requirementRows.filter((row) => row.id !== action.payload);
        },
        openAddModal: (state) => {
            state.isAddModalOpen = true;
            state.indicatorSearch = '';
            state.selectedIndicatorId = '';
            state.selectedPj = 'Kaprodi';
        },
        closeAddModal: (state) => {
            if (state.loadingIndicators) {
                return;
            }

            state.isAddModalOpen = false;
            state.indicatorSearch = '';
            state.selectedIndicatorId = '';
            state.selectedPj = 'Kaprodi';
        },
        setAllIndicators: (state, action) => {
            state.allIndicators = action.payload;
        },
        setLoadingIndicators: (state, action) => {
            state.loadingIndicators = action.payload;
        },
        setIndicatorSearch: (state, action) => {
            state.indicatorSearch = action.payload;
        },
        setSelectedIndicatorId: (state, action) => {
            state.selectedIndicatorId = action.payload;
        },
        setSelectedPj: (state, action) => {
            state.selectedPj = action.payload;
        },
        resetBorangView: (state) => {
            state.selectedFaculty = null;
            state.selectedProdi = null;
            state.viewMode = 'pairs';
            state.requirementRows = [];
            state.activeRequirementTab = 'DEKAN';
            state.requirementsSearch = '';
            state.requirementsStandardFilter = 'ALL';
            state.requirementsPage = 1;
            state.isAddModalOpen = false;
            state.indicatorSearch = '';
            state.selectedIndicatorId = '';
            state.selectedPj = 'Kaprodi';
        },
    },
});

export const {
    setUnits,
    setLoading,
    setLoadingRequirements,
    setViewMode,
    setSelectedFaculty,
    setSelectedProdi,
    setActiveRequirementTab,
    setPairsPage,
    setRequirementsPage,
    setPairsSearch,
    setPairsFacultyFilter,
    setRequirementsSearch,
    setRequirementsStandardFilter,
    setRequirementRows,
    addRequirementRow,
    removeRequirementRow,
    openAddModal,
    closeAddModal,
    setAllIndicators,
    setLoadingIndicators,
    setIndicatorSearch,
    setSelectedIndicatorId,
    setSelectedPj,
    resetBorangView,
} = borangSlice.actions;

export default borangSlice.reducer;
