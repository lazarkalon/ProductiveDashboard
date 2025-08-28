// src/app/sprint-dashboard/ProjectTaskListSelector.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Project { id: string; name: string }
interface Board   { id: string; name: string }
interface TaskList{ id: string; name: string }

const ProjectTaskListSelector: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<Project[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [taskLists, setTaskLists] = useState<TaskList[]>([])

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('')
  const [selectedTaskList, setSelectedTaskList] = useState('')

  const [projectSearch, setProjectSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const productiveToken = searchParams.get('productive_token') || ''

  // Hydrate from URL (ids)
  useEffect(() => {
    const pid  = searchParams.get('project_id') || ''
    const bid  = searchParams.get('sprint_board_id') || ''
    const tlid = searchParams.get('sprint_task_list_id') || ''
    if (pid)  setSelectedProject(pid)
    if (bid)  setSelectedBoard(bid)
    if (tlid) setSelectedTaskList(tlid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load projects
  useEffect(() => {
    fetch(`/api/productive/projects`)
      .then(r => r.json()).then(setProjects)
      .catch(e => console.error('projects', e))
  }, [])

  // Load boards on project change
  useEffect(() => {
    if (!selectedProject) { setBoards([]); setTaskLists([]); return }
    fetch(`/api/productive/boards?project_id=${selectedProject}&filter[status]=1`)
      .then(r => r.json()).then(setBoards)
      .catch(e => console.error('boards', e))
  }, [selectedProject])

  // Load task lists on board change
  useEffect(() => {
    if (!selectedBoard || !selectedProject) { setTaskLists([]); return }
    fetch(`/api/productive/task_lists?board_id=${selectedBoard}&project_id=${selectedProject}`)
      .then(r => r.json()).then(setTaskLists)
      .catch(e => console.error('task_lists', e))
  }, [selectedBoard, selectedProject])

  const pushParams = (entries: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(entries).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k))
    router.push(`?${params.toString()}`)
  }

  const selectProject = (p: Project) => {
    setSelectedProject(p.id)
    setProjectSearch(p.name)
    setBoards([]); setTaskLists([]); setSelectedBoard(''); setSelectedTaskList('')
    setShowDropdown(false); setHighlightIndex(-1)
    pushParams({
      project_id: p.id,
      sprint_board_id: undefined,
      sprint_task_list_id: undefined,
      // keep any existing past_* selections untouched
    })
  }

  const handleBoardChange = (id: string) => {
    setSelectedBoard(id)
    setTaskLists([]); setSelectedTaskList('')
    pushParams({
      sprint_board_id: id || undefined,
      sprint_task_list_id: undefined,
    })
  }

  const handleTaskListSelect = (id: string) => {
    setSelectedTaskList(id)
    pushParams({
      sprint_task_list_id: id || undefined,
    })
  }

  const filteredProjects = useMemo(() =>
    projects
      .filter(p =>
        p.name.toLowerCase().includes((projectSearch || '').toLowerCase())
      )
      .slice() // copy so we don’t change the original
      .sort((a, b) => a.name.localeCompare(b.name)),
  [projects, projectSearch]
  )

  // click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false); setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => (i + 1) % filteredProjects.length) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightIndex(i => (i - 1 + filteredProjects.length) % filteredProjects.length) }
    if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); selectProject(filteredProjects[highlightIndex]) }
    if (e.key === 'Escape') { setShowDropdown(false); setHighlightIndex(-1) }
  }

  const clearSearch = () => {
    setProjectSearch(''); setShowDropdown(false)
    setSelectedProject(''); setBoards([]); setTaskLists([])
    pushParams({
      project_id: undefined,
      sprint_board_id: undefined,
      sprint_task_list_id: undefined,
    })
  }

  return (
    <div className="flex space-x-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3 text-sm">

        {/* Project combobox */}
        <div className="relative w-96" ref={wrapperRef}>
          <input
            type="text"
            placeholder="Search Project..."
            value={projectSearch || (projects.find(p => p.id === selectedProject)?.name || '')}
            onChange={(e) => { setProjectSearch(e.target.value); setShowDropdown(true); setHighlightIndex(-1) }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#111828] border border-[#1F2938] text-white p-2 pr-8 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {projectSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-2 text-gray-300 hover:text-white"
            >
              ✕
            </button>
          )}
          {showDropdown && filteredProjects.length > 0 && (
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

        {/* Task list */}
        <select
          className="bg-[#111828] border border-[#1F2938] text-white p-2 rounded w-64"
          value={selectedTaskList}
          onChange={e => handleTaskListSelect(e.target.value)}
          disabled={!selectedBoard}
        >
          <option value="">Select Task List</option>
          {taskLists.slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default ProjectTaskListSelector