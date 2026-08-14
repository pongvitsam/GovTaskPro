import { useMemo, useState } from 'react';
import {
  applyBoardFilters,
  groupTasksByStatus,
  isOverdue,
} from './boardUtils';

export function useBoardFilters({ visibleTasks, currentUser, projectsById, assignableUsers }) {
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const boardFilterUsers = useMemo(
    () => [...assignableUsers].sort((a, b) => String(a.name).localeCompare(String(b.name), 'th')),
    [assignableUsers],
  );

  const taskCountByAssignee = useMemo(() => {
    const counts = new Map();
    visibleTasks.forEach((task) => {
      const id = String(task.assignedTo || '');
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return counts;
  }, [visibleTasks]);

  const stats = useMemo(() => {
    const myId = currentUser?.id;
    let myCount = 0;
    let overdueCount = 0;
    let reviewCount = 0;
    visibleTasks.forEach((task) => {
      if (myId && String(task.assignedTo) === String(myId)) myCount += 1;
      if (isOverdue(task.dueDate, task.status)) overdueCount += 1;
      if (task.status === 'Review') reviewCount += 1;
    });
    return {
      total: visibleTasks.length,
      myCount,
      overdueCount,
      reviewCount,
    };
  }, [visibleTasks, currentUser?.id]);

  const filteredTasks = useMemo(
    () => applyBoardFilters(visibleTasks, {
      search,
      personFilter,
      statusFilter,
      overdueOnly,
      myTasksOnly,
      currentUserId: currentUser?.id,
    }, { projectsById }),
    [visibleTasks, search, personFilter, statusFilter, overdueOnly, myTasksOnly, currentUser?.id, projectsById],
  );

  const boardTasksByStatus = useMemo(
    () => groupTasksByStatus(filteredTasks, currentUser?.id),
    [filteredTasks, currentUser?.id],
  );

  const hasActiveFilters = !!(
    search.trim()
    || personFilter !== 'all'
    || statusFilter !== 'all'
    || overdueOnly
    || myTasksOnly
  );

  const clearFilters = () => {
    setSearch('');
    setPersonFilter('all');
    setStatusFilter('all');
    setOverdueOnly(false);
    setMyTasksOnly(false);
  };

  const toggleChip = (chip) => {
    if (chip === 'all') {
      clearFilters();
      return;
    }
    if (chip === 'mine') {
      setMyTasksOnly((v) => !v);
      setOverdueOnly(false);
      setStatusFilter('all');
      return;
    }
    if (chip === 'overdue') {
      setOverdueOnly((v) => !v);
      setMyTasksOnly(false);
      setStatusFilter('all');
      return;
    }
    if (chip === 'review') {
      setStatusFilter((v) => (v === 'Review' ? 'all' : 'Review'));
      setMyTasksOnly(false);
      setOverdueOnly(false);
    }
  };

  return {
    search,
    setSearch,
    personFilter,
    setPersonFilter,
    statusFilter,
    overdueOnly,
    myTasksOnly,
    boardFilterUsers,
    taskCountByAssignee,
    stats,
    filteredTasks,
    boardTasksByStatus,
    hasActiveFilters,
    clearFilters,
    toggleChip,
  };
}
