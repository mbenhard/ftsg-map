"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ContextMenuProps {
  x: number
  y: number
  svgX: number
  svgY: number
  type: "canvas" | "node" | "signal"
  id?: string
  parentId?: string
  currentText?: string
  onClose: () => void
  onAddNode: () => void
  onAddSignal: () => void
  onEditText: (text: string) => void
  onDelete: () => void
}

export function ContextMenu({
  x,
  y,
  svgX,
  svgY,
  type,
  id,
  parentId,
  currentText = "",
  onClose,
  onAddNode,
  onAddSignal,
  onEditText,
  onDelete,
}: ContextMenuProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(currentText)
  const [isRenaming, setIsRenaming] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Update text state when currentText prop changes
  useEffect(() => {
    setText(currentText)
  }, [currentText])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onEditText(text)
    setIsEditing(false)
    setIsRenaming(false)
  }

  // Calculate position to ensure menu stays within viewport
  const calculatePosition = () => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Get menu dimensions (or estimate if not yet rendered)
    const menuWidth = menuRef.current?.offsetWidth || 150
    const menuHeight = menuRef.current?.offsetHeight || 200

    // Calculate position
    let posX = x
    let posY = y

    // Adjust if menu would go off-screen
    if (posX + menuWidth > viewportWidth) {
      posX = viewportWidth - menuWidth - 10
    }

    if (posY + menuHeight > viewportHeight) {
      posY = viewportHeight - menuHeight - 10
    }

    return { left: posX, top: posY }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-2 min-w-[150px]"
      style={calculatePosition()}
    >
      {isEditing || isRenaming ? (
        <form onSubmit={handleEditSubmit} className="p-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="mb-2 bg-white text-black border-gray-300 focus:border-blue-500"
            placeholder={isRenaming ? "Enter new name" : "Enter text"}
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white"
              onClick={() => {
                setIsEditing(false)
                setIsRenaming(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 text-white hover:bg-blue-500">
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col space-y-1">
          {type === "canvas" && (
            <Button
              variant="ghost"
              className="justify-start text-white hover:bg-gray-700 hover:text-white"
              onClick={onAddNode}
            >
              Add Node
            </Button>
          )}

          {type === "node" && (
            <>
              <Button
                variant="ghost"
                className="justify-start text-white hover:bg-gray-700 hover:text-white"
                onClick={() => {
                  setIsRenaming(true)
                }}
              >
                Rename Node
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-white hover:bg-gray-700 hover:text-white"
                onClick={onAddSignal}
              >
                Add Signal
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-red-400 hover:bg-gray-700 hover:text-red-300"
                onClick={onDelete}
              >
                Delete Node
              </Button>
            </>
          )}

          {type === "signal" && (
            <>
              <Button
                variant="ghost"
                className="justify-start text-white hover:bg-gray-700 hover:text-white"
                onClick={() => {
                  setIsRenaming(true)
                }}
              >
                Rename Signal
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-red-400 hover:bg-gray-700 hover:text-red-300"
                onClick={onDelete}
              >
                Delete Signal
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

