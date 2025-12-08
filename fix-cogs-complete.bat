@echo off
chcp 65001 >nul
echo ==========================================
echo COGS 修复 - 完整执行流程
echo ==========================================
echo.

echo 请先在 Supabase Dashboard 的 SQL Editor 中执行:
echo 打开文件: add-cogs-to-database.sql
echo.
echo 按任意键继续补充历史数据...
pause >nul

echo.
echo ==========================================
echo 步骤 1: 补充历史销售记录的 COGS
echo ==========================================
node backfill-sales-cogs.js
if errorlevel 1 (
    echo.
    echo 补充失败！请检查错误信息
    pause
    exit /b 1
)

echo.
echo ==========================================
echo 步骤 2: 验证修复结果
echo ==========================================
node verify-cogs-fix.js
if errorlevel 1 (
    echo.
    echo 验证失败！请检查错误信息
    pause
    exit /b 1
)

echo.
echo ==========================================
echo 修复完成！
echo ==========================================
echo.
echo 请检查上面的验证结果，确认:
echo 1. 销售记录的 COGS 完整性
echo 2. 损益报表数据的合理性
echo 3. 特殊案例处理是否正确
echo.
echo 详细说明请查看: COGS_FIX_GUIDE.md
echo.
pause
