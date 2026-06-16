DELETE FROM public.script_templates
WHERE contractor_type = 'other'
  AND kind = 'hello'
  AND label = 'Other - Standard greeting';
