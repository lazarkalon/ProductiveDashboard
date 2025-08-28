'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface Project { id: string; name: string }
interface Board   { id: string; name: string }
interface TaskList{ id: string; name: string }

export default function ProjectSprintMultiSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<Project[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [taskLists, setTaskLists] = useState<TaskList[]>([])

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('')
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<string[]>([])

  // project search (combobox)
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const projectWrapRef = useRef<HTMLDivElement>(null)

  // sprint popover
  const [showSprintPopover, setShowSprintPopover] = useState(false)
  const sprintWrapRef = useRef<HTMLDivElement>(null)

  // 🔹 Hydrate from URL on first render
  useEffect(() => {
    const pid   = searchParams.get('project_id') || ''
    const bid   = searchParams.get('board_id') || ''
    const tlids = (searchParams.get('task_list_ids') || '').split(',').filter(Boolean)
    if (pid) setSelectedProject(pid)
    if (bid) setSelectedBoard(bid)
    if (tlids.length) setSelectedTaskListIds(tlids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Load projects (server route uses hard-coded credentials)
  useEffect(() => {
    const ac = new AbortController()
    fetch('/api/productive/projects', { signal: ac.signal })
      .then(r => r.json()).then(setProjects)
      .catch(e => { if (e.name !== 'AbortError') console.error('projects', e) })
    return () => ac.abort()
  }, [])

  // ✅ Load boards when project changes (active only)
  useEffect(() => {
    if (!selectedProject) { setBoards([]); setTaskLists([]); return }
    const ac = new AbortController()
    fetch(`/api/productive/boards?project_id=${encodeURIComponent(selectedProject)}`, { signal: ac.signal })
      .then(r => r.json()).then(setBoards)
      .catch(e => { if (e.name !== 'AbortError') console.error('boards', e) })
    return () => ac.abort()
  }, [selectedProject])

  // ✅ Load task lists when board changes
  useEffect(() => {
    if (!selectedBoard || !selectedProject) { setTaskLists([]); return }
    const ac = new AbortController()
    fetch(`/api/productive/task_lists?board_id=${encodeURIComponent(selectedBoard)}&project_id=${encodeURIComponent(selectedProject)}`, { signal: ac.signal })
      .then(r => r.json()).then(setTaskLists)
      .catch(e => { if (e.name !== 'AbortError') console.error('task_lists', e) })
    return () => ac.abort()
  }, [selectedBoard, selectedProject])

  // ✅ Update URL helper (no token params anymore)
  const pushParams = (entries: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(entries).forEach(([k, v]) => { v ? params.set(k, v) : params.delete(k) })
    router.push(`?${params.toString()}`)
  }

  // ✅ Select project (push project_id)
  const selectProject = (project: Project) => {
    setSelectedProject(project.id)
    setProjectSearch(project.name)
    setBoards([]); setTaskLists([])
    setSelectedBoard(''); setSelectedTaskListIds([])
    setShowProjectDropdown(false); setHighlightIndex(-1)
    setShowSprintPopover(false)
    pushParams({
      project_id: project.id,
      board_id: undefined,
      task_list_ids: undefined,
      project_name: project.name, // optional display
    })
  }

  // ✅ Board change
  const handleBoardChange = (id: string) => {
    setSelectedBoard(id)
    setTaskLists([]); setSelectedTaskListIds([])
    const name = boards.find(b => b.id === id)?.name
    pushParams({
      board_id: id || undefined,
      task_list_ids: undefined,
      board_name: name, // optional display
    })
  }

  // ✅ Task list multi-select (checkboxes)
  const toggleTaskListId = (id: string) => {
    const next = new Set(selectedTaskListIds)
    next.has(id) ? next.delete(id) : next.add(id)
    const ids = Array.from(next)
    setSelectedTaskListIds(ids)
    pushParams({ task_list_ids: ids.length ? ids.join(',') : undefined })
  }

  // ✅ Remove a single selected sprint from the chips
  const removeSelectedId = (id: string) => {
    const ids = selectedTaskListIds.filter(x => x !== id)
    setSelectedTaskListIds(ids)
    pushParams({ task_list_ids: ids.length ? ids.join(',') : undefined })
  }

  // ✅ Filtered projects for the combo
  const filteredProjects = useMemo(
    () => projects
      .filter(p => p.name.toLowerCase().includes((projectSearch || '').toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, projectSearch]
  )

  // 🔹 Click-outside to close both popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectWrapRef.current && !projectWrapRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false); setHighlightIndex(-1)
      }
      if (sprintWrapRef.current && !sprintWrapRef.current.contains(event.target as Node)) {
        setShowSprintPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 🔹 Keyboard nav for project list
  const handleProjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProjectDropdown || filteredProjects.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => (prev + 1) % filteredProjects.length) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightIndex(prev => (prev - 1 + filteredProjects.length) % filteredProjects.length) }
    if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); selectProject(filteredProjects[highlightIndex]) }
    if (e.key === 'Escape') { setShowProjectDropdown(false); setHighlightIndex(-1) }
  }

  const clearSearch = () => {
    setProjectSearch(''); setShowProjectDropdown(false)
    setSelectedProject(''); setBoards([]); setTaskLists([])
    setSelectedBoard(''); setSelectedTaskListIds([])
    pushParams({
      project_id: undefined, board_id: undefined, task_list_ids: undefined,
      project_name: undefined, board_name: undefined
    })
  }

  // Selected sprint chips
  const selectedSprintItems = useMemo(() => {
    const byId = new Map(taskLists.map(t => [t.id, t.name]))
    return selectedTaskListIds.map(id => ({ id, name: byId.get(id) ?? id }))
  }, [selectedTaskListIds, taskLists])

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 gap-3 text-sm mb-4">
      {/* Project combobox */}
      <div className="relative w-96" ref={projectWrapRef}>
        <input
          type="text"
          placeholder="Search Project..."
          value={projectSearch || (projects.find(p => p.id === selectedProject)?.name || '')}
          onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDropdown(true); setHighlightIndex(-1) }}
          onFocus={() => setShowProjectDropdown(true)}
          onKeyDown={handleProjectKeyDown}
          className="w-full bg-[#111828] border border-[#1F2938] text-white p-2 pr-8 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {projectSearch && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-2 text-gray-300 hover:text-white"
            aria-label="Clear project search"
          >
            ✕
          </button>
        )}
        {showProjectDropdown && filteredProjects.length > 0 && (
          <ul className="absolute z-10 w-full bg-gray-800 text-white border border-gray-700 rounded mt-1 max-h-64 overflow-y-auto shadow-lg">
            {filteredProjects.map((p, i) => (
              <li
                key={p.id}
                onClick={() => selectProject(p)}
                className={`px-3 py-2 cursor-pointer ${i === highlightIndex ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Board */}
      <select
        className="bg-[#111828] border border-[#1F2938] text-white p-2 rounded w-64"
        value={selectedBoard}
        onChange={e => handleBoardChange(e.target.value)}
        disabled={!selectedProject}
      >
        <option value="">Select Folder</option>
        {boards.slice().sort((a, b) => a.name.localeCompare(b.name)).map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      {/* Collapsed Sprint Selector + Popover */}
      <div className="relative" ref={sprintWrapRef}>
        <button
          type="button"
          onClick={() => setShowSprintPopover(v => !v)}
          disabled={!selectedBoard}
          className={`flex items-center gap-2 min-w-[14rem] max-w-[28rem] px-3 py-2 rounded border ${
            selectedBoard ? 'bg-[#111828] border-[#1F2938] text-white' : 'bg-gray-800/50 border-gray-700 text-gray-500'
          }`}
          title={!selectedBoard ? 'Choose a folder first' : 'Select sprints'}
        >
          <div className="flex flex-wrap items-center gap-1 grow">
            {selectedSprintItems.length === 0 ? (
              <span className="text-gray-400">Select One or More Sprints</span>
            ) : (
              <>
                {selectedSprintItems.slice(0, 3).map(s => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-xs"
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSelectedId(s.id) }}
                      className="ml-1 opacity-80 hover:opacity-100"
                      aria-label={`Remove ${s.name}`}
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedSprintItems.length > 3 && (
                  <span className="text-xs text-gray-300">
                    +{selectedSprintItems.length - 3} more
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-80" />
        </button>

        {showSprintPopover && (
          <div className="absolute z-20 mt-2 w-[28rem] rounded border border-gray-700 bg-gray-800 shadow-xl p-2 relative">
            <div className="text-gray-300 mb-1 px-1">Select One or More Sprints</div>

            <div className="max-h-64 overflow-y-auto pr-2 pb-8">
              {!selectedBoard ? (
                <div className="text-gray-500 text-sm px-1 py-2">Choose a folder first</div>
              ) : taskLists.length === 0 ? (
                <div className="text-gray-500 text-sm px-1 py-2">No task lists</div>
              ) : (
                <ul className="space-y-1">
                  {taskLists
                    .slice()
                    .sort((a, b) => b.name.localeCompare(a.name))
                    .map((tl) => {
                      const checked = selectedTaskListIds.includes(tl.id)
                      return (
                        <li key={tl.id} className="flex items-center gap-2 px-2 py-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => toggleTaskListId(tl.id)}
                          />
                          <label className="text-white truncate" title={tl.name}>
                            {tl.name}
                          </label>
                        </li>
                      )
                    })}
                </ul>
              )}
            </div>

            <div className="absolute bottom-1 right-2">
              <button
                type="button"
                onClick={() => setShowSprintPopover(false)}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}