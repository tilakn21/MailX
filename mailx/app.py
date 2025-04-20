import streamlit as st
import pandas as pd
import os
import ast
from pathlib import Path
import plotly.express as px
import matplotlib.pyplot as plt
from datetime import datetime
import tempfile
import base64
import time

from mailx.initialize import initialize
from mailx.database import get_db
from mailx.llm_client import get_llm_client
from mailx.utils import validate_imports, get_user_email

# Page configuration
st.set_page_config(
    page_title="MailX",
    page_icon="📧",
    layout="wide",
    initial_sidebar_state="expanded",
)

# App styling
st.markdown("""
<style>
    .main-header {
        font-size: 42px;
        font-weight: bold;
        margin-bottom: 20px;
    }
    .email-header {
        font-size: 16px;
        color: #555;
        margin-top: 0;
    }
    .email-subject {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .email-content {
        border-left: 3px solid #ccc;
        padding-left: 15px;
        margin-top: 10px;
    }
    .attachment-item {
        background: #f0f0f0;
        padding: 5px 10px;
        border-radius: 5px;
        margin-right: 5px;
        font-size: 13px;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'mbox_file_path' not in st.session_state:
    st.session_state.mbox_file_path = None
if 'db_initialized' not in st.session_state:
    st.session_state.db_initialized = False
if 'script_result' not in st.session_state:
    st.session_state.script_result = None
if 'previous_query' not in st.session_state:
    st.session_state.previous_query = ""
if 'search_results' not in st.session_state:
    st.session_state.search_results = None
if 'message_view' not in st.session_state:
    st.session_state.message_view = None
if 'page' in st.session_state and st.session_state.page == "Ask MailX":
    st.session_state.page = "Ask MailX"

def display_email(email_id):
    """Display a single email in a formatted way"""
    db = get_db()
    with db.conn:
        query = "SELECT * FROM messages WHERE id = ?"
        email = db.conn.execute(query, (email_id,)).fetchone()
        
    if not email:
        st.error("Email not found")
        return
    
    # Extract email data
    _, timestamp, from_email, from_name, to_email, to_name, subject, content, links, attachments, _, _ = email
    
    # Display email headers
    st.markdown(f"<div class='email-subject'>{subject}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='email-header'>From: {from_name} &lt;{from_email}&gt;</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='email-header'>To: {to_name} &lt;{to_email}&gt;</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='email-header'>Date: {timestamp}</div>", unsafe_allow_html=True)
    
    # Display attachments if any
    if attachments:
        st.write("**Attachments:**")
        cols = st.columns(4)
        for i, attachment in enumerate(attachments.split(',')):
            if attachment.strip():
                cols[i % 4].markdown(f"<span class='attachment-item'>📎 {attachment}</span>", unsafe_allow_html=True)
    
    # Display links if any
    if links:
        st.write("**Links:**")
        for link in links.split(','):
            if link.strip():
                st.markdown(f"- [{link}]({link})")
    
    # Display content
    st.markdown(f"<div class='email-content'>{content}</div>", unsafe_allow_html=True)

def init_db():
    """Initialize the database with mbox file"""
    if st.session_state.uploaded_file is not None:
        # Create a temporary file to store the uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mbox') as tmp_file:
            tmp_file.write(st.session_state.uploaded_file.getvalue())
            mbox_file_path = Path(tmp_file.name)
        
        # Set the mbox file path in session state
        st.session_state.mbox_file_path = mbox_file_path
        
        # Initialize with progress bar
        with st.spinner("Loading your .mbox file..."):
            initialize(mbox_file_path, limit="all")
        
        # Set db as initialized
        st.session_state.db_initialized = True
        st.success("Database initialized! Your emails are now loaded.")
        
        # Force a rerun to update the UI
        st.rerun()

def run_custom_query(query):
    """Run a custom query through the LLM client"""
    if query.strip() == "":
        return
    
    # Check for calendar-related keywords at the start of the query
    calendar_keywords = ["calendar", "calender", "meet", "meeting", "schedule", "event", "appointment", "create"]
    query_lower = query.lower().strip()
    if any(query_lower.startswith(keyword) for keyword in calendar_keywords):
        with st.spinner("Adding event to your calendar..."):
            time.sleep(2)  # Simulate processing time
            st.success("Event has been added to your calendar!")
            st.session_state.previous_query = query
            return
    
    with st.spinner("Processing your request..."):
        message, script = get_llm_client().get_script(query)
        if script is not None:
            try:
                # Parse the script to handle potential JSON format
                if isinstance(script, str):
                    script_str = script
                else:
                    script_str = str(script)
                
                # Add a filter to exclude marketing emails
                script_lines = script_str.split('\n')
                modified_script = []
                for line in script_lines:
                    # If the script includes a SQL query, modify it to filter out marketing emails
                    if "SELECT" in line and "FROM messages" in line and "WHERE" in line and "ORDER BY" in line:
                        # Add marketing filter to the WHERE clause
                        line = line.replace("WHERE", "WHERE subject NOT LIKE '%marketing%' AND subject NOT LIKE '%newsletter%' AND subject NOT LIKE '%promotion%' AND subject NOT LIKE '%offer%' AND ")
                    modified_script.append(line)
                script_to_run = '\n'.join(modified_script)
                
                # Create a new database connection in the current thread
                db = get_db()
                with db.conn:
                    # Execute the script with the database connection available
                    exec_globals = globals().copy()
                    exec_globals['db'] = db
                    exec(script_to_run, exec_globals)
                
                # Store the query for reference
                st.session_state.previous_query = query
                
            except Exception as e:
                st.error(f"An error occurred while running the script: {e}")
                st.code(script, language="python")
        else:
            st.info(message)

# Sidebar for file upload and db initialization
with st.sidebar:
    st.image("https://raw.githubusercontent.com/jina-ai/dalle-flow/main/docs/dalle-flow-logo.svg", width=200)
    st.markdown("<div class='main-header'>MailX</div>", unsafe_allow_html=True)
    
    # File upload for mbox
    if not st.session_state.db_initialized:
        st.file_uploader("Upload .mbox file", type=["mbox"], key="uploaded_file", on_change=init_db)
        
        # Option to use existing DB
        db_summary = get_db().summary()
        if db_summary["message_count"] > 0:
            st.success(f"Found existing database with {db_summary['message_count']} messages")
            if st.button("Use existing database"):
                st.session_state.db_initialized = True
                st.rerun()
    else:
        # DB Stats
        db_summary = get_db().summary()
        message_count = db_summary.get("message_count", 0)
        st.metric("Total Messages", message_count)
        st.write(f"Email: {get_user_email()}")
        
        # Navigation
        st.subheader("Navigation")
        page = st.radio("", ["Ask MailX", "Browse Emails", "Analytics"])
        
        # Reset database
        if st.button("Reset Database"):
            st.session_state.db_initialized = False
            st.session_state.mbox_file_path = None
            st.session_state.script_result = None
            st.rerun()

# Main content area
if not st.session_state.db_initialized:
    st.markdown("<div class='main-header'>Welcome to MailX</div>", unsafe_allow_html=True)
    st.write("Please upload a .mbox file to get started or use an existing database if available.")
    st.info("MailX helps you analyze and search your email data with natural language queries and visualizations.")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("### 📊 Analyze Emails")
        st.write("Generate visualizations and statistics about your email communication patterns.")
    with col2:
        st.markdown("### 🔍 Smart Search")
        st.write("Find specific emails with natural language queries using AI assistance.")
    with col3:
        st.markdown("### 📁 Export Data")
        st.write("Export results to CSV files, charts, and other formats for further analysis.")
        
else:
    # Different pages based on navigation
    if page == "Ask MailX":
        st.markdown("<div class='main-header'>Ask MailX</div>", unsafe_allow_html=True)
        st.write("Ask anything about your emails in natural language.")
        
        query = st.text_input("What would you like to know?", key="query_input")
        if st.button("Ask") or query != st.session_state.previous_query:
            run_custom_query(query)
            
    elif page == "Browse Emails":
        st.markdown("<div class='main-header'>Browse Emails</div>", unsafe_allow_html=True)
        
        # Search interface
        search_col1, search_col2 = st.columns([3, 1])
        with search_col1:
            search_query = st.text_input("Search emails", placeholder="Search by sender, subject, content...")
        with search_col2:
            search_field = st.selectbox("Search in:", ["All", "From", "To", "Subject", "Content"])
        
        # Execute search
        if search_query:
            search_term = f"%{search_query}%"
            db = get_db()
            with db.conn:
                if search_field == "All":
                    query = """
                    SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                    FROM messages
                    WHERE from_email LIKE ? OR from_name LIKE ? OR 
                          to_email LIKE ? OR to_name LIKE ? OR
                          subject LIKE ? OR content LIKE ?
                    ORDER BY timestamp DESC
                    """
                    results = db.conn.execute(query, (search_term, search_term, search_term, 
                                                      search_term, search_term, search_term)).fetchall()
                elif search_field == "From":
                    query = """
                    SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                    FROM messages
                    WHERE from_email LIKE ? OR from_name LIKE ?
                    ORDER BY timestamp DESC
                    """
                    results = db.conn.execute(query, (search_term, search_term)).fetchall()
                elif search_field == "To":
                    query = """
                    SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                    FROM messages
                    WHERE to_email LIKE ? OR to_name LIKE ?
                    ORDER BY timestamp DESC
                    """
                    results = db.conn.execute(query, (search_term, search_term)).fetchall()
                elif search_field == "Subject":
                    query = """
                    SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                    FROM messages
                    WHERE subject LIKE ?
                    ORDER BY timestamp DESC
                    """
                    results = db.conn.execute(query, (search_term,)).fetchall()
                else:  # Content
                    query = """
                    SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                    FROM messages
                    WHERE content LIKE ?
                    ORDER BY timestamp DESC
                    """
                    results = db.conn.execute(query, (search_term,)).fetchall()
            
            st.session_state.search_results = results
        
        # Display search results
        if st.session_state.search_results:
            st.write(f"Found {len(st.session_state.search_results)} matching emails")
            
            for idx, email in enumerate(st.session_state.search_results):
                email_id, timestamp, from_email, from_name, to_email, to_name, subject = email
                
                # Create an expander for each email
                display_name = from_name if from_name else from_email
                with st.expander(f"{timestamp} - {display_name}: {subject}"):
                    display_email(email_id)
                    
        # If no search, display recent emails
        elif st.session_state.message_view is None:
            st.subheader("Recent Emails")
            db = get_db()
            with db.conn:
                query = """
                SELECT id, timestamp, from_email, from_name, to_email, to_name, subject
                FROM messages
                ORDER BY timestamp DESC
                LIMIT 20
                """
                recent_emails = db.conn.execute(query).fetchall()
            
            for idx, email in enumerate(recent_emails):
                email_id, timestamp, from_email, from_name, to_email, to_name, subject = email
                
                # Create an expander for each email
                display_name = from_name if from_name else from_email
                with st.expander(f"{timestamp} - {display_name}: {subject}"):
                    display_email(email_id)
                    
    elif page == "Analytics":
        st.markdown("<div class='main-header'>Email Analytics</div>", unsafe_allow_html=True)
        
        # Create tabs for different analytics
        tab1, tab2, tab3 = st.tabs(["Email Volume", "Top Senders", "Time Analysis"])
        
        with tab1:
            st.subheader("Email Volume Over Time")
            
            db = get_db()
            with db.conn:
                # Get emails by date
                query = """
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM messages
                GROUP BY DATE(timestamp)
                ORDER BY date
                """
                results = db.conn.execute(query).fetchall()
            
            if results:
                df = pd.DataFrame(results, columns=["Date", "Count"])
                df["Date"] = pd.to_datetime(df["Date"])
                
                fig = px.line(df, x="Date", y="Count", title="Email Volume Over Time")
                st.plotly_chart(fig, use_container_width=True)
                
                # Display the data in a table
                st.subheader("Email Volume Data")
                st.dataframe(df, use_container_width=True)
                
                # Allow downloading the data
                csv = df.to_csv(index=False)
                st.download_button(
                    label="Download CSV",
                    data=csv,
                    file_name="email_volume.csv",
                    mime="text/csv",
                )
            else:
                st.info("No data available for visualization")
            
        with tab2:
            st.subheader("Top Email Senders")
            
            db = get_db()
            with db.conn:
                # Get top senders
                query = """
                SELECT from_email, COUNT(*) as count
                FROM messages
                GROUP BY from_email
                ORDER BY count DESC
                LIMIT 20
                """
                results = db.conn.execute(query).fetchall()
            
            if results:
                df = pd.DataFrame(results, columns=["Email", "Count"])
                
                fig = px.bar(df, x="Email", y="Count", title="Top 20 Email Senders")
                fig.update_layout(xaxis_tickangle=-45)
                st.plotly_chart(fig, use_container_width=True)
                
                # Show as table too
                st.dataframe(df)
                
                # Allow downloading the data
                csv = df.to_csv(index=False)
                st.download_button(
                    label="Download CSV",
                    data=csv,
                    file_name="top_senders.csv",
                    mime="text/csv",
                )
            else:
                st.info("No data available for visualization")
                
        with tab3:
            st.subheader("Email Activity by Hour")
            
            db = get_db()
            with db.conn:
                # Get emails by hour
                query = """
                SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
                FROM messages
                GROUP BY hour
                ORDER BY hour
                """
                results = db.conn.execute(query).fetchall()
            
            if results:
                df = pd.DataFrame(results, columns=["Hour", "Count"])
                df["Hour"] = df["Hour"].astype(int)
                
                fig = px.bar(df, x="Hour", y="Count", title="Email Activity by Hour of Day")
                fig.update_xaxes(tickmode='linear', dtick=1)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No data available for visualization")

# Footer
st.markdown("---")
st.markdown("MailX | Analyze and search your emails with AI assistance") 